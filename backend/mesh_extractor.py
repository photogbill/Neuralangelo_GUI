import asyncio
import subprocess
import logging
from pathlib import Path
from typing import Dict, List
import trimesh
import numpy as np

logger = logging.getLogger(__name__)

class MeshExtractor:
    """Extract and process meshes from trained Neuralangelo models"""
    
    def __init__(self, neuralangelo_path: str = "./neuralangelo"):
        self.neuralangelo_path = Path(neuralangelo_path)
    
    async def extract(
        self,
        project_path: str,
        checkpoint: str = "latest",
        resolution: int = 2048,
        block_resolution: int = 128,
        threshold: float = 0.005,
        export_formats: List[str] = ["ply", "obj"]
    ) -> Dict:
        """
        Extract mesh from trained model
        
        Args:
            project_path: Path to project directory
            checkpoint: Checkpoint to use ("latest" or specific iteration)
            resolution: Grid resolution for marching cubes
            block_resolution: Block resolution for memory efficiency
            threshold: Isosurface threshold
            export_formats: List of export formats
        
        Returns:
            Dictionary with extraction results
        """
        try:
            project_path = Path(project_path)
            meshes_path = project_path / "meshes"
            meshes_path.mkdir(exist_ok=True)
            
            # Find checkpoint file
            checkpoint_path = self._get_checkpoint_path(project_path, checkpoint)
            if not checkpoint_path:
                raise FileNotFoundError(f"Checkpoint not found: {checkpoint}")
            
            logger.info(f"Extracting mesh from checkpoint: {checkpoint_path}")
            
            # Run mesh extraction
            output_mesh = meshes_path / f"mesh_{checkpoint}.ply"
            await self._run_extraction(
                checkpoint_path,
                output_mesh,
                resolution,
                block_resolution,
                threshold
            )
            
            # Post-process mesh
            logger.info("Post-processing mesh...")
            mesh = trimesh.load(output_mesh)
            mesh = self._post_process_mesh(mesh)
            
            # Export to different formats
            exported_files = []
            for fmt in export_formats:
                output_file = meshes_path / f"mesh_{checkpoint}.{fmt}"
                logger.info(f"Exporting to {fmt}...")
                
                if fmt == "ply":
                    mesh.export(output_file)
                elif fmt == "obj":
                    mesh.export(output_file)
                elif fmt == "glb":
                    mesh.export(output_file)
                
                exported_files.append(str(output_file))
            
            # Get mesh statistics
            stats = self._get_mesh_statistics(mesh)
            
            logger.info("Mesh extraction completed successfully!")
            
            return {
                "status": "success",
                "files": exported_files,
                "statistics": stats
            }
            
        except Exception as e:
            logger.error(f"Mesh extraction failed: {e}")
            raise
    
    def _get_checkpoint_path(self, project_path: Path, checkpoint: str) -> Path:
        """Find checkpoint file"""
        checkpoint_dir = project_path / "checkpoints"
        
        if checkpoint == "latest":
            # Find the latest checkpoint
            checkpoints = sorted(checkpoint_dir.glob("*.pth"))
            if checkpoints:
                return checkpoints[-1]
        else:
            # Specific checkpoint
            checkpoint_file = checkpoint_dir / f"{checkpoint}.pth"
            if checkpoint_file.exists():
                return checkpoint_file
        
        return None
    
    async def _run_extraction(
        self,
        checkpoint_path: Path,
        output_path: Path,
        resolution: int,
        block_resolution: int,
        threshold: float
    ):
        """Run Neuralangelo mesh extraction script"""
        cmd = [
            "python", "projects/neuralangelo/scripts/extract_mesh.py",
            "--config", str(checkpoint_path.parent.parent / "neuralangelo_config.yaml"),
            "--checkpoint", str(checkpoint_path),
            "--output_file", str(output_path),
            "--resolution", str(resolution),
            "--block_res", str(block_resolution),
            "--threshold", str(threshold)
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(self.neuralangelo_path)
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"Mesh extraction failed: {stderr.decode()}")
        
        logger.info(stdout.decode())
    
    def _post_process_mesh(self, mesh: trimesh.Trimesh) -> trimesh.Trimesh:
        """Post-process extracted mesh"""
        # Remove disconnected components
        components = mesh.split(only_watertight=False)
        if len(components) > 1:
            # Keep the largest component
            mesh = max(components, key=lambda m: len(m.vertices))
            logger.info(f"Removed {len(components) - 1} disconnected components")
        
        # Remove duplicate vertices
        mesh.merge_vertices()
        
        # Remove degenerate faces
        mesh.remove_degenerate_faces()
        
        # Smooth mesh (Laplacian smoothing)
        # Note: This is a simple smoothing, adjust iterations as needed
        mesh = trimesh.smoothing.filter_laplacian(mesh, iterations=5)
        
        # Fix normals
        mesh.fix_normals()
        
        return mesh
    
    def _get_mesh_statistics(self, mesh: trimesh.Trimesh) -> Dict:
        """Get mesh statistics"""
        return {
            "vertices": len(mesh.vertices),
            "faces": len(mesh.faces),
            "bounds": mesh.bounds.tolist(),
            "extents": mesh.extents.tolist(),
            "is_watertight": mesh.is_watertight,
            "volume": float(mesh.volume) if mesh.is_watertight else None,
            "area": float(mesh.area)
        }
    
    async def decimate_mesh(self, mesh_path: str, target_faces: int) -> str:
        """Reduce mesh polygon count"""
        mesh = trimesh.load(mesh_path)
        
        if len(mesh.faces) > target_faces:
            # Simplify mesh
            mesh = mesh.simplify_quadric_decimation(target_faces)
            
            output_path = Path(mesh_path).with_stem(
                Path(mesh_path).stem + "_decimated"
            )
            mesh.export(output_path)
            
            logger.info(f"Decimated mesh: {len(mesh.faces)} faces")
            return str(output_path)
        
        return mesh_path
    
    async def generate_textures(self, project_path: str, mesh_path: str) -> Dict:
        """Generate texture maps for the mesh"""
        # This is a placeholder for texture generation
        # In practice, you would need to implement texture baking from the trained model
        logger.info("Texture generation is not yet implemented")
        return {
            "status": "not_implemented",
            "message": "Texture generation requires additional implementation"
        }