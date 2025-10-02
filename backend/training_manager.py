import asyncio
import subprocess
import os
import yaml
import logging
from pathlib import Path
from typing import Dict, Optional
import signal
import psutil

logger = logging.getLogger(__name__)

class TrainingManager:
    """Manages Neuralangelo training processes"""
    
    def __init__(self, neuralangelo_path: str = "./neuralangelo"):
        self.neuralangelo_path = Path(neuralangelo_path)
        self.active_trainings: Dict[str, Dict] = {}
    
    async def start_training(
        self,
        project_path: str,
        config: Dict,
        websocket_manager
    ):
        """Start training process"""
        project_name = config.get("scene_name", "default")
        
        try:
            # Generate Neuralangelo config file
            config_file = self._generate_config(project_path, config)
            
            # Prepare training command
            cmd = self._prepare_training_command(project_path, config_file, config)
            
            # Start training process
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.neuralangelo_path)
            )
            
            self.active_trainings[project_name] = {
                "process": process,
                "status": "running",
                "iteration": 0,
                "loss": 0.0,
                "config": config
            }
            
            # Monitor training output
            asyncio.create_task(
                self._monitor_training(project_name, process, websocket_manager)
            )
            
            logger.info(f"Started training for project: {project_name}")
            
        except Exception as e:
            logger.error(f"Failed to start training: {e}")
            await websocket_manager.broadcast({
                "type": "training_error",
                "message": str(e)
            })
            raise
    
    def _generate_config(self, project_path: str, config: Dict) -> str:
        """Generate Neuralangelo YAML config file"""
        project_path = Path(project_path)
        config_file = project_path / "neuralangelo_config.yaml"
        
        # Template for Neuralangelo config
        neuralangelo_config = {
            "name": config["scene_name"],
            "arch": {
                "type": "neuralangelo",
                "latent_dim": 256,
                "encoding": {
                    "type": "hashgrid",
                    "levels": config.get("hash_encoding_levels", 16),
                    "max_resolution": 2048
                }
            },
            "data": {
                "type": "colmap",
                "root": str(project_path / "colmap" / "dense"),
                "img_scale": 1.0,
                "num_workers": 4
            },
            "model": {
                "surface": {
                    "level_init": 0.5,
                    "isosurface": {
                        "method": "mt",
                        "resolution": config.get("resolution", 1024),
                        "chunk": 1000000
                    }
                },
                "object": {
                    "sdf": {
                        "encoding": {
                            "coarse2fine": {
                                "enabled": True,
                                "init_active_level": 4,
                                "step": 5000
                            }
                        },
                        "gradient": {
                            "mode": "numerical",
                            "taps": 4
                        }
                    }
                },
                "render": {
                    "type": "volsdf",
                    "num_samples": {
                        "coarse": 64,
                        "fine": 16
                    }
                }
            },
            "optim": {
                "type": "Adam",
                "lr": config.get("learning_rate", 0.001),
                "sched": {
                    "type": "two_steps_with_warmup",
                    "warm_up_end": 5000,
                    "two_steps": [300000, 400000],
                    "gamma": 0.33
                }
            },
            "logging": {
                "checkpoint_save_iter": 10000,
                "save_checkpoint": True,
                "checkpoint_path": str(project_path / "checkpoints")
            },
            "trainer": {
                "max_iter": config.get("max_iter", 500000),
                "batch_size": config.get("batch_size", 4),
                "amp": False
            }
        }
        
        # Write config file
        with open(config_file, 'w') as f:
            yaml.dump(neuralangelo_config, f, default_flow_style=False)
        
        logger.info(f"Generated config file: {config_file}")
        return str(config_file)
    
    def _prepare_training_command(self, project_path: str, config_file: str, config: Dict) -> list:
        """Prepare the training command"""
        cmd = [
            "python", "-m", "torch.distributed.run",
            "--nproc_per_node=1",
            "train.py",
            "--config", config_file,
            "--logdir", str(Path(project_path) / "logs"),
            "--show_pbar"
        ]
        
        # Add GPU selection if specified
        if "gpu_ids" in config:
            os.environ["CUDA_VISIBLE_DEVICES"] = str(config["gpu_ids"])
        
        return cmd
    
    async def _monitor_training(self, project_name: str, process, websocket_manager):
        """Monitor training progress and send updates"""
        try:
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                
                line = line.decode().strip()
                logger.info(f"[{project_name}] {line}")
                
                # Parse training output
                progress = self._parse_training_output(line)
                if progress:
                    self.active_trainings[project_name].update(progress)
                    
                    # Send update via WebSocket
                    await websocket_manager.broadcast({
                        "type": "training_progress",
                        "project": project_name,
                        "data": progress
                    })
                
                # Send log message
                await websocket_manager.broadcast({
                    "type": "training_log",
                    "project": project_name,
                    "message": line
                })
            
            # Training completed
            await process.wait()
            self.active_trainings[project_name]["status"] = "completed"
            
            await websocket_manager.broadcast({
                "type": "training_complete",
                "project": project_name
            })
            
        except Exception as e:
            logger.error(f"Error monitoring training: {e}")
            self.active_trainings[project_name]["status"] = "error"
            await websocket_manager.broadcast({
                "type": "training_error",
                "project": project_name,
                "message": str(e)
            })
    
    def _parse_training_output(self, line: str) -> Optional[Dict]:
        """Parse training output to extract metrics"""
        try:
            # Look for iteration and loss information
            # Example: "iter: 1000, loss: 0.0234"
            if "iter" in line and "loss" in line:
                parts = line.split(",")
                iteration = None
                loss = None
                
                for part in parts:
                    part = part.strip()
                    if "iter" in part:
                        iteration = int(part.split(":")[1].strip())
                    elif "loss" in part:
                        loss = float(part.split(":")[1].strip())
                
                if iteration is not None and loss is not None:
                    return {
                        "iteration": iteration,
                        "loss": loss
                    }
        except Exception as e:
            logger.debug(f"Could not parse line: {line}, error: {e}")
        
        return None
    
    async def pause_training(self, project_name: str):
        """Pause training (send SIGSTOP)"""
        if project_name in self.active_trainings:
            process = self.active_trainings[project_name]["process"]
            os.kill(process.pid, signal.SIGSTOP)
            self.active_trainings[project_name]["status"] = "paused"
            logger.info(f"Paused training for project: {project_name}")
    
    async def resume_training(self, project_name: str):
        """Resume training (send SIGCONT)"""
        if project_name in self.active_trainings:
            process = self.active_trainings[project_name]["process"]
            os.kill(process.pid, signal.SIGCONT)
            self.active_trainings[project_name]["status"] = "running"
            logger.info(f"Resumed training for project: {project_name}")
    
    async def stop_training(self, project_name: str):
        """Stop training process"""
        if project_name in self.active_trainings:
            process = self.active_trainings[project_name]["process"]
            
            # Try graceful shutdown first
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=10)
            except asyncio.TimeoutError:
                # Force kill if not responding
                process.kill()
                await process.wait()
            
            self.active_trainings[project_name]["status"] = "stopped"
            logger.info(f"Stopped training for project: {project_name}")
    
    def get_status(self, project_name: str) -> Dict:
        """Get training status"""
        if project_name in self.active_trainings:
            return self.active_trainings[project_name]
        return {"status": "not_started"}
    
    def list_checkpoints(self, project_path: str) -> list:
        """List available checkpoints"""
        checkpoint_path = Path(project_path) / "checkpoints"
        if checkpoint_path.exists():
            return sorted([f.name for f in checkpoint_path.glob("*.pth")])
        return []