# Neuralangelo GUI Environment Configuration
# Copy this file to .env and adjust values as needed

# Backend Configuration
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0

# Neuralangelo Configuration
NEURALANGELO_PATH=./neuralangelo
COLMAP_PATH=/usr/bin/colmap

# GPU Configuration
GPU_DEVICES=0  # Comma-separated list of GPU IDs to use (e.g., "0,1,2")
CUDA_VISIBLE_DEVICES=0

# Project Settings
MAX_PROJECTS=10
PROJECT_STORAGE_PATH=./projects
LOG_PATH=./logs

# Training Defaults
DEFAULT_MAX_ITER=500000
DEFAULT_BATCH_SIZE=4
DEFAULT_LEARNING_RATE=0.001
DEFAULT_RESOLUTION=1024

# COLMAP Settings
COLMAP_GPU_INDEX=0
COLMAP_MAX_NUM_MATCHES=32768

# Security (for production)
# ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
# API_KEY=your-secret-api-key-here

# Performance
MAX_UPLOAD_SIZE=5368709120  # 5GB in bytes
WORKER_PROCESSES=4

# Logging
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
