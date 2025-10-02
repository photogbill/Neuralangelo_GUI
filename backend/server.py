from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import asyncio
import json
import os
import shutil
from pathlib import Path
from datetime import datetime
import logging

from colmap_wrapper import COLMAPProcessor
from training_manager import TrainingManager
from mesh_extractor import MeshExtractor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Neuralangelo GUI API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
active_connections: List[WebSocket] = []
projects_dir = Path("./projects")
projects_dir.mkdir(exist_ok=True)

# Pydantic models
class ProjectConfig(BaseModel):
    scene_name: str
    project_path: str
    dataset_path: str
    max_iter: int = 500000
    resolution: int = 1024
    model_type: str = "neuralangelo"
    hash_encoding_levels: int = 16
    learning_rate: float = 0.001
    batch_size: int = 4

class COLMAPConfig(BaseModel):
    camera_model: str = "PINHOLE"
    quality: str = "high"
    dense_reconstruction: bool = True
    generate_point_cloud: bool = True

class MeshExtractionConfig(BaseModel):
    checkpoint: str = "latest"
    resolution: int = 2048
    block_resolution: int = 128
    threshold: float = 0.005
    export_formats: List[str] = ["ply", "obj"]
    post_process: bool = True

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Initialize managers
training_manager = TrainingManager()
colmap_processor = COLMAPProcessor()
mesh_extractor = MeshExtractor()

@app.get("/")
async def root():
    return {"message": "Neuralangelo GUI API", "version": "1.0.0"}

@app.post("/api/projects/create")
async def create_project(config: ProjectConfig):
    """Create a new project"""
    try:
        project_path = projects_dir / config.scene_name
        project_path.mkdir(exist_ok=True)
        
        # Create project structure
        (project_path / "images").mkdir(exist_ok=True)
        (project_path / "colmap").mkdir(exist_ok=True)
        (project_path / "checkpoints").mkdir(exist_ok=True)
        (project_path / "meshes").mkdir(exist_ok=True)
        
        # Save config
        config_file = project_path / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config.dict(), f, indent=2)
        
        logger.info(f"Created project: {config.scene_name}")
        return {"status": "success", "project_path": str(project_path)}
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_name}/upload-images")
async def upload_images(project_name: str, files: List[UploadFile] = File(...)):
    """Upload images to project"""
    try:
        project_path = projects_dir / project_name
        images_path = project_path / "images"
        
        uploaded_files = []
        for file in files:
            file_path = images_path / file.filename
            with open(file_path, 'wb') as f:
                shutil.copyfileobj(file.file, f)
            uploaded_files.append(file.filename)
        
        logger.info(f"Uploaded {len(uploaded_files)} images to {project_name}")
        return {"status": "success", "files": uploaded_files}
    except Exception as e:
        logger.error(f"Error uploading images: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_name}/process-colmap")
async def process_colmap(project_name: str, config: COLMAPConfig, background_tasks: BackgroundTasks):
    """Process images with COLMAP"""
    try:
        project_path = projects_dir / project_name
        
        async def process_task():
            await manager.broadcast({
                "type": "colmap_status",
                "status": "processing",
                "message": "Starting COLMAP processing..."
            })
            
            try:
                result = await colmap_processor.process(
                    images_path=str(project_path / "images"),
                    output_path=str(project_path / "colmap"),
                    camera_model=config.camera_model,
                    quality=config.quality
                )
                
                await manager.broadcast({
                    "type": "colmap_status",
                    "status": "complete",
                    "message": "COLMAP processing completed!",
                    "result": result
                })
            except Exception as e:
                await manager.broadcast({
                    "type": "colmap_status",
                    "status": "error",
                    "message": f"COLMAP error: {str(e)}"
                })
        
        background_tasks.add_task(process_task)
        return {"status": "started"}
    except Exception as e:
        logger.error(f"Error starting COLMAP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_name}/train")
async def start_training(project_name: str, config: ProjectConfig, background_tasks: BackgroundTasks):
    """Start training"""
    try:
        project_path = projects_dir / project_name
        
        async def train_task():
            await training_manager.start_training(
                project_path=str(project_path),
                config=config.dict(),
                websocket_manager=manager
            )
        
        background_tasks.add_task(train_task)
        return {"status": "started"}
    except Exception as e:
        logger.error(f"Error starting training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_name}/train/pause")
async def pause_training(project_name: str):
    """Pause training"""
    try:
        await training_manager.pause_training(project_name)
        return {"status": "paused"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_name}/train/resume")
async def resume_training(project_name: str):
    """Resume training"""
    try:
        await training_manager.resume_training(project_name)
        return {"status": "resumed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_name}/train/stop")
async def stop_training(project_name: str):
    """Stop training"""
    try:
        await training_manager.stop_training(project_name)
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_name}/extract-mesh")
async def extract_mesh(project_name: str, config: MeshExtractionConfig, background_tasks: BackgroundTasks):
    """Extract mesh from trained model"""
    try:
        project_path = projects_dir / project_name
        
        async def extract_task():
            await manager.broadcast({
                "type": "extraction_status",
                "status": "processing",
                "message": "Starting mesh extraction..."
            })
            
            try:
                result = await mesh_extractor.extract(
                    project_path=str(project_path),
                    checkpoint=config.checkpoint,
                    resolution=config.resolution,
                    block_resolution=config.block_resolution,
                    threshold=config.threshold,
                    export_formats=config.export_formats
                )
                
                await manager.broadcast({
                    "type": "extraction_status",
                    "status": "complete",
                    "message": "Mesh extraction completed!",
                    "result": result
                })
            except Exception as e:
                await manager.broadcast({
                    "type": "extraction_status",
                    "status": "error",
                    "message": f"Extraction error: {str(e)}"
                })
        
        background_tasks.add_task(extract_task)
        return {"status": "started"}
    except Exception as e:
        logger.error(f"Error starting mesh extraction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_name}/status")
async def get_project_status(project_name: str):
    """Get project status"""
    try:
        project_path = projects_dir / project_name
        if not project_path.exists():
            raise HTTPException(status_code=404, detail="Project not found")
        
        config_file = project_path / "config.json"
        if config_file.exists():
            with open(config_file) as f:
                config = json.load(f)
        else:
            config = {}
        
        training_status = training_manager.get_status(project_name)
        
        return {
            "project_name": project_name,
            "config": config,
            "training": training_status,
            "has_colmap": (project_path / "colmap" / "sparse").exists(),
            "checkpoints": list((project_path / "checkpoints").glob("*.pth"))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects")
async def list_projects():
    """List all projects"""
    try:
        projects = []
        for project_path in projects_dir.iterdir():
            if project_path.is_dir():
                config_file = project_path / "config.json"
                if config_file.exists():
                    with open(config_file) as f:
                        config = json.load(f)
                    projects.append({
                        "name": project_path.name,
                        "path": str(project_path),
                        "config": config
                    })
        return {"projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_name}/download/{file_type}")
async def download_file(project_name: str, file_type: str):
    """Download project files"""
    try:
        project_path = projects_dir / project_name
        
        if file_type == "mesh":
            mesh_file = list((project_path / "meshes").glob("*.ply"))[0]
            return FileResponse(mesh_file, filename=mesh_file.name)
        elif file_type == "config":
            config_file = project_path / "config.json"
            return FileResponse(config_file, filename=f"{project_name}_config.json")
        else:
            raise HTTPException(status_code=400, detail="Invalid file type")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back for heartbeat
            await websocket.send_json({"type": "heartbeat", "timestamp": datetime.now().isoformat()})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")