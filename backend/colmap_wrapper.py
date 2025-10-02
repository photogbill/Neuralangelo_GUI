import subprocess
import os
import logging
from pathlib import Path
from typing import Dict, Optional
import asyncio

logger = logging.getLogger(__name__)

class COLMAPProcessor:
    """Wrapper for COLMAP processing pipeline"""
    
    def __init__(self, colmap_path: str = "colmap"):
        self.colmap_path = colmap_path
        
    async def process(
        self,
        images_path: str,
        output_path: str,
        camera_model: str = "PINHOLE",
        quality: str = "high"
    ) -> Dict:
        """
        Process images with COLMAP
        
        Args:
            images_path: Path to input images
            output_path: Path for COLMAP output
            camera_model: Camera model (PINHOLE, RADIAL, OPENCV, etc.)
            quality: Processing quality (high, medium, low)
        
        Returns:
            Dictionary with processing results
        """
        try:
            images_path = Path(images_path)
            output_path = Path(output_path)
            
            # Create output directories
            database_path = output_path / "database.db"
            sparse_path = output_path / "sparse"
            dense_path = output_path / "dense"
            
            sparse_path.mkdir(parents=True, exist_ok=True)
            dense_path.mkdir(parents=True, exist_ok=True)
            
            logger.info("Starting COLMAP feature extraction...")
            await self._feature_extraction(images_path, database_path, camera_model)
            
            logger.info("Starting COLMAP feature matching...")
            await self._feature_matching(database_path, quality)
            
            logger.info("Starting COLMAP sparse reconstruction...")
            await self._sparse_reconstruction(database_path, images_path, sparse_path)
            
            logger.info("Starting COLMAP image undistortion...")
            await self._image_undistortion(images_path, sparse_path, dense_path)
            
            logger.info("COLMAP processing completed successfully!")
            
            # Get statistics
            stats = self._get_statistics(sparse_path)
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "statistics": stats
            }
            
        except Exception as e:
            logger.error(f"COLMAP processing failed: {e}")
            raise
    
    async def _run_command(self, cmd: list):
        """Run a COLMAP command asynchronously"""
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"COLMAP command failed: {stderr.decode()}")
        
        return stdout.decode()
    
    async def _feature_extraction(self, images_path: Path, database_path: Path, camera_model: str):
        """Extract features from images"""
        cmd = [
            self.colmap_path, "feature_extractor",
            "--database_path", str(database_path),
            "--image_path", str(images_path),
            "--ImageReader.camera_model", camera_model,
            "--SiftExtraction.use_gpu", "1"
        ]
        await self._run_command(cmd)
    
    async def _feature_matching(self, database_path: Path, quality: str):
        """Match features between images"""
        # Determine matching parameters based on quality
        quality_params = {
            "high": {"max_num_matches": 32768},
            "medium": {"max_num_matches": 16384},
            "low": {"max_num_matches": 8192}
        }
        params = quality_params.get(quality, quality_params["high"])
        
        cmd = [
            self.colmap_path, "exhaustive_matcher",
            "--database_path", str(database_path),
            "--SiftMatching.use_gpu", "1",
            "--SiftMatching.max_num_matches", str(params["max_num_matches"])
        ]
        await self._run_command(cmd)
    
    async def _sparse_reconstruction(self, database_path: Path, images_path: Path, output_path: Path):
        """Perform sparse reconstruction"""
        cmd = [
            self.colmap_path, "mapper",
            "--database_path", str(database_path),
            "--image_path", str(images_path),
            "--output_path", str(output_path)
        ]
        await self._run_command(cmd)
    
    async def _image_undistortion(self, images_path: Path, sparse_path: Path, dense_path: Path):
        """Undistort images for dense reconstruction"""
        # Find the reconstruction folder (usually 0)
        reconstruction_path = sparse_path / "0"
        if not reconstruction_path.exists():
            reconstruction_path = list(sparse_path.glob("*"))[0]
        
        cmd = [
            self.colmap_path, "image_undistorter",
            "--image_path", str(images_path),
            "--input_path", str(reconstruction_path),
            "--output_path", str(dense_path),
            "--output_type", "COLMAP"
        ]
        await self._run_command(cmd)
    
    async def dense_reconstruction(self, dense_path: Path):
        """Perform dense reconstruction (optional, time-consuming)"""
        # Stereo matching
        cmd = [
            self.colmap_path, "patch_match_stereo",
            "--workspace_path", str(dense_path),
            "--PatchMatchStereo.gpu_index", "0"
        ]
        await self._run_command(cmd)
        
        # Stereo fusion
        cmd = [
            self.colmap_path, "stereo_fusion",
            "--workspace_path", str(dense_path),
            "--output_path", str(dense_path / "fused.ply")
        ]
        await self._run_command(cmd)
    
    def _get_statistics(self, sparse_path: Path) -> Dict:
        """Get reconstruction statistics"""
        try:
            # Find the reconstruction folder
            reconstruction_path = sparse_path / "0"
            if not reconstruction_path.exists():
                reconstruction_path = list(sparse_path.glob("*"))[0]
            
            # Count images and points
            cameras_file = reconstruction_path / "cameras.txt"
            images_file = reconstruction_path / "images.txt"
            points_file = reconstruction_path / "points3D.txt"
            
            num_cameras = 0
            num_images = 0
            num_points = 0
            
            if cameras_file.exists():
                with open(cameras_file) as f:
                    num_cameras = sum(1 for line in f if not line.startswith("#"))
            
            if images_file.exists():
                with open(images_file) as f:
                    lines = [line for line in f if not line.startswith("#")]
                    num_images = len(lines) // 2  # Each image has 2 lines
            
            if points_file.exists():
                with open(points_file) as f:
                    num_points = sum(1 for line in f if not line.startswith("#"))
            
            return {
                "num_cameras": num_cameras,
                "num_images": num_images,
                "num_points": num_points
            }
        except Exception as e:
            logger.warning(f"Could not get statistics: {e}")
            return {}
    
    def check_colmap_installation(self) -> bool:
        """Check if COLMAP is installed"""
        try:
            result = subprocess.run(
                [self.colmap_path, "--version"],
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except FileNotFoundError:
            return False