# Neuralangelo GUI - Installation Guide

Complete step-by-step installation instructions for setting up the Neuralangelo GUI.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Ubuntu 20.04+ or Windows 10/11 with WSL2
- [ ] NVIDIA GPU with 12GB+ VRAM (RTX 3090, 4090, A5000, etc.)
- [ ] CUDA 11.3 or higher installed
- [ ] Python 3.8 or higher
- [ ] Node.js 16.x or higher
- [ ] Git

## Step 1: System Preparations

### Install CUDA (if not already installed)

```bash
# Check if CUDA is installed
nvcc --version

# If not installed, download from NVIDIA website:
# https://developer.nvidia.com/cuda-downloads
```

### Install System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    cmake \
    git \
    python3-pip \
    libboost-all-dev \
    libeigen3-dev \
    libfreeimage-dev \
    libmetis-dev \
    libgoogle-glog-dev \
    libgflags-dev \
    libsqlite3-dev \
    libglew-dev \
    qtbase5-dev \
    libqt5opengl5-dev \
    libcgal-dev \
    libcgal-qt5-dev
```

## Step 2: Install COLMAP

### Option A: Install from Package Manager (Recommended)

```bash
sudo apt-get install colmap
```

### Option B: Build from Source

```bash
git clone https://github.com/colmap/colmap.git
cd colmap
mkdir build
cd build
cmake ..
make -j
sudo make install
```

Verify installation:
```bash
colmap --version
```

## Step 3: Clone the Repository

```bash
git clone https://github.com/yourusername/neuralangelo-gui.git
cd neuralangelo-gui
```

## Step 4: Install Neuralangelo Backend

### Clone Neuralangelo

```bash
git clone https://github.com/NVlabs/neuralangelo.git
cd neuralangelo
```

### Create Conda Environment

```bash
# Create environment
conda create --name neuralangelo python=3.8 -y
conda activate neuralangelo

# Install PyTorch (adjust for your CUDA version)
pip install torch==1.13.1+cu117 torchvision==0.14.1+cu117 --extra-index-url https://download.pytorch.org/whl/cu117

# Install Neuralangelo dependencies
pip install -r requirements.txt

# Install tiny-cuda-nn
pip install git+https://github.com/NVlabs/tiny-cuda-nn/#subdirectory=bindings/torch
```

### Test Neuralangelo Installation

```bash
python -c "import torch; print(torch.cuda.is_available())"
# Should print: True
```

```bash
cd ..  # Back to neuralangelo-gui directory
```

## Step 5: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Create .env file

```bash
cat > .env << EOF
NEURALANGELO_PATH=../neuralangelo
COLMAP_PATH=/usr/bin/colmap
BACKEND_PORT=8000
GPU_DEVICES=0
MAX_PROJECTS=10
EOF
```

## Step 6: Install Frontend Dependencies

```bash
cd ..  # Back to root directory
npm install
```

### Create frontend .env file

```bash
cat > .env << EOF
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
EOF
```

## Step 7: Project Structure Setup

Your project should now look like this:

```
neuralangelo-gui/
├── backend/
│   ├── server.py
│   ├── colmap_wrapper.py
│   ├── training_manager.py
│   ├── mesh_extractor.py
│   ├── requirements.txt
│   └── .env
├── src/
│   ├── NeuralAngeloGUI.jsx
│   ├── utils/
│   │   └── api.js
│   ├── App.jsx
│   └── main.jsx
├── neuralangelo/
│   └── (Neuralangelo repository)
├── projects/
│   └── (Will be created automatically)
├── package.json
├── vite.config.js
└── .env
```

## Step 8: Create Required Files

### Create src/App.jsx

```jsx
import NeuralAngeloGUI from './NeuralAngeloGUI'

function App() {
  return <NeuralAngeloGUI />
}

export default App
```

### Create src/main.jsx

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Create src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Create index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Neuralangelo GUI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### Create tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Create postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Step 9: Test the Installation

### Start the Backend Server

```bash
# Terminal 1 - Activate conda environment and start backend
conda activate neuralangelo
cd backend
python server.py
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Start the Frontend

```bash
# Terminal 2 - Start frontend (in project root)
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Access the Application

Open your browser and navigate to: `http://localhost:3000`

You should see the Neuralangelo GUI interface!

## Step 10: Verify Everything Works

### Test Backend API

```bash
curl http://localhost:8000/
# Should return: {"message":"Neuralangelo GUI API","version":"1.0.0"}
```

### Test WebSocket Connection

Open the browser console (F12) and you should see:
```
WebSocket connected
```

### Test COLMAP

```bash
colmap --version
# Should display COLMAP version info
```

### Test GPU

```bash
nvidia-smi
# Should show your GPU
```

## Troubleshooting

### Issue: "CUDA out of memory"

**Solution:** Reduce batch size in Configuration tab or close other GPU applications

### Issue: "COLMAP not found"

**Solution:** 
```bash
which colmap  # Find COLMAP path
# Update backend/.env with correct path
```

### Issue: "WebSocket connection failed"

**Solution:** 
- Ensure backend is running on port 8000
- Check firewall settings
- Verify .env configuration

### Issue: "npm install fails"

**Solution:**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Python module not found"

**Solution:**
```bash
conda activate neuralangelo
pip install --upgrade -r backend/requirements.txt
```

### Issue: "Permission denied" errors

**Solution:**
```bash
chmod +x backend/server.py
# Or run with sudo for system-wide installation
```

## Performance Optimization

### For Better Training Speed:

1. Use mixed precision training (AMP)
2. Increase batch size if you have more VRAM
3. Use multiple GPUs if available
4. Ensure CUDA is properly configured

### For Better COLMAP Processing:

1. Use GPU acceleration for feature extraction
2. Reduce image resolution if processing is slow
3. Use "medium" quality for faster results during testing

## Next Steps

1. Read the [README.md](README.md) for usage instructions
2. Check out example projects in `examples/`
3. Join our Discord for support
4. Read Neuralangelo paper for understanding the method

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Search existing [GitHub Issues](https://github.com/yourusername/neuralangelo-gui/issues)
3. Ask on our [Discord server](https://discord.gg/yourinvite)
4. Create a new GitHub issue with:
   - Your OS and GPU
   - Full error message
   - Steps to reproduce

## Uninstallation

To remove everything:

```bash
# Remove conda environment
conda deactivate
conda remove --name neuralangelo --all

# Remove GUI
cd ..
rm -rf neuralangelo-gui

# Optionally remove COLMAP
sudo apt-get remove colmap
```

---

Congratulations! You've successfully installed Neuralangelo GUI! 🎉
