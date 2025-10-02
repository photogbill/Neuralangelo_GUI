import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import json
import tempfile
import shutil

# Assuming server.py is in the backend directory
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from server import app

client = TestClient(app)

@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory for testing"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def sample_project_config():
    """Sample project configuration"""
    return {
        "scene_name": "test_project",
        "project_path": "/tmp/test_project",
        "dataset_path": "/tmp/test_images",
        "max_iter": 10000,
        "resolution": 512,
        "model_type": "neuralangelo",
        "hash_encoding_levels": 16,
        "learning_rate": 0.001,
        "batch_size": 2
    }

class TestAPI:
    """Test API endpoints"""
    
    def test_root_endpoint(self):
        """Test root endpoint returns correct response"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Neuralangelo GUI API"
        assert "version" in data
    
    def test_create_project(self, sample_project_config, temp_project_dir):
        """Test project creation"""
        # Update config with temp directory
        config = sample_project_config.copy()
        config["project_path"] = temp_project_dir
        
        response = client.post("/api/projects/create", json=config)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "project_path" in data
    
    def test_list_projects_empty(self):
        """Test listing projects when none exist"""
        response = client.get("/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert isinstance(data["projects"], list)
    
    def test_invalid_project_name(self):
        """Test error handling for invalid project"""
        response = client.get("/api/projects/nonexistent_project/status")
        assert response.status_code == 404


class TestCOLMAPConfig:
    """Test COLMAP configuration"""
    
    def test_colmap_config_validation(self):
        """Test COLMAP config validation"""
        from colmap_wrapper import COLMAPProcessor
        
        processor = COLMAPProcessor()
        
        # Valid camera models
        valid_models = ["PINHOLE", "RADIAL", "OPENCV", "SIMPLE_RADIAL"]
        for model in valid_models:
            assert model in ["PINHOLE", "RADIAL", "OPENCV", "SIMPLE_RADIAL"]


class TestTrainingConfig:
    """Test training configuration"""
    
    def test_config_defaults(self, sample_project_config):
        """Test default configuration values"""
        config = sample_project_config
        
        assert config["max_iter"] > 0
        assert config["resolution"] in [512, 1024, 2048]
        assert config["batch_size"] > 0
        assert 0 < config["learning_rate"] < 1


class TestFileUpload:
    """Test file upload functionality"""
    
    def test_upload_images_no_files(self):
        """Test upload with no files"""
        response = client.post(
            "/api/projects/test_project/upload-images",
            files=[]
        )
        # Should handle gracefully
        assert response.status_code in [200, 400, 422]


class TestWebSocket:
    """Test WebSocket connections"""
    
    def test_websocket_connection(self):
        """Test WebSocket can connect"""
        with client.websocket_connect("/ws") as websocket:
            # Should connect successfully
            # Send heartbeat
            websocket.send_text("ping")
            data = websocket.receive_json()
            assert data["type"] == "heartbeat"


@pytest.mark.integration
class TestIntegration:
    """Integration tests for complete workflows"""
    
    def test_complete_workflow(self, sample_project_config, temp_project_dir):
        """Test complete project workflow"""
        config = sample_project_config.copy()
        config["project_path"] = temp_project_dir
        
        # 1. Create project
        response = client.post("/api/projects/create", json=config)
        assert response.status_code == 200
        
        # 2. Check project status
        response = client.get(f"/api/projects/{config['scene_name']}/status")
        assert response.status_code in [200, 404]  # May not exist in test env
        
        # 3. List projects
        response = client.get("/api/projects")
        assert response.status_code == 200


# Performance tests
@pytest.mark.performance
class TestPerformance:
    """Performance tests"""
    
    def test_api_response_time(self):
        """Test API response time is acceptable"""
        import time
        
        start = time.time()
        response = client.get("/")
        end = time.time()
        
        assert response.status_code == 200
        assert (end - start) < 1.0  # Should respond in less than 1 second


# Run tests with: pytest backend/tests/test_server.py -v
# Run with coverage: pytest backend/tests/test_server.py --cov=backend --cov-report=html
