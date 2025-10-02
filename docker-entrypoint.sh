#!/bin/bash
set -e

echo "=========================================="
echo "Neuralangelo GUI Docker Container"
echo "=========================================="

# Check if NVIDIA GPU is available
if command -v nvidia-smi &> /dev/null; then
    echo "✓ GPU detected:"
    nvidia-smi --query-gpu=name --format=csv,noheader
else
    echo "⚠ Warning: No GPU detected. Training will be very slow or fail."
fi

# Check COLMAP installation
if command -v colmap &> /dev/null; then
    echo "✓ COLMAP installed: $(colmap --version 2>&1 | head -n 1)"
else
    echo "✗ Error: COLMAP not found"
    exit 1
fi

# Check Python and PyTorch
echo "✓ Python version: $(python3 --version)"
echo "✓ PyTorch CUDA available: $(python3 -c 'import torch; print(torch.cuda.is_available())')"

# Create necessary directories
mkdir -p /app/projects
mkdir -p /app/logs

echo "=========================================="
echo "Starting Neuralangelo GUI Backend..."
echo "=========================================="

# Execute the command passed to docker run
exec "$@"
