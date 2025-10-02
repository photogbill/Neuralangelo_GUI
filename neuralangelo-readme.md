# Neuralangelo GUI - 3D Reconstruction Studio

<div align="center">

![Neuralangelo GUI Banner](https://via.placeholder.com/800x200/1e293b/60a5fa?text=Neuralangelo+GUI)

**A comprehensive graphical interface for Neuralangelo 3D reconstruction**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 📖 Overview

Neuralangelo GUI is a user-friendly graphical interface for [NVIDIA's Neuralangelo](https://github.com/NVlabs/neuralangelo), making high-fidelity 3D surface reconstruction accessible to everyone. No command-line experience required!

This application provides a complete workflow from image capture to 3D mesh export, handling COLMAP processing, neural training configuration, and mesh extraction all within an intuitive interface.

## ✨ Features

### 🎯 Core Functionality
- **Project Management** - Create, save, and organize reconstruction projects
- **Data Processing** - Automated COLMAP integration for camera pose estimation
- **Visual Configuration** - Adjust all training parameters through an intuitive UI
- **Real-time Training** - Monitor training progress with live metrics and logs
- **Mesh Extraction** - Export high-quality 3D meshes in multiple formats
- **Results Visualization** - View and analyze your reconstructed models

### 🚀 Key Benefits
- ✅ No command-line experience needed
- ✅ Complete workflow in one application
- ✅ Real-time training monitoring
- ✅ Multiple export formats (.ply, .obj, .glb)
- ✅ Advanced settings with sensible defaults
- ✅ Checkpoint management
- ✅ Comprehensive logging

## 📋 Prerequisites

Before installing Neuralangelo GUI, ensure you have:

- **Node.js** (v16.x or higher)
- **Python** (v3.8 or higher)
- **CUDA-capable GPU** (NVIDIA RTX series recommended)
- **CUDA Toolkit** (v11.3 or higher)
- **COLMAP** (v3.8 or higher)
- **Neuralangelo** (original repository)

### System Requirements
- **OS**: Linux (Ubuntu 20.04+), Windows 10/11 with WSL2
- **RAM**: 16GB minimum, 32GB recommended
- **GPU VRAM**: 12GB minimum, 24GB+ recommended
- **Storage**: 50GB+ free space for projects and models

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/neuralangelo-gui.git
cd neuralangelo-gui
```

### 2. Install Neuralangelo Backend

```bash
# Clone Neuralangelo
git clone https://github.com/NVlabs/neuralangelo.git
cd neuralangelo

# Create conda environment
conda create --name neuralangelo python=3.8
conda activate neuralangelo

# Install dependencies
pip install -r requirements.txt

# Install tiny-cuda-nn
pip install git+https://github.com/NVlabs/tiny-cuda-nn/#subdirectory=bindings/torch

cd ..
```

### 3. Install COLMAP

**Ubuntu/Debian:**
```bash
sudo apt-get install colmap
```

**Windows (WSL2):**
```bash
sudo apt-get update
sudo apt-get install colmap
```

**From Source:**
See [COLMAP installation guide](https://colmap.github.io/install.html)

### 4. Install GUI Dependencies

```bash
# Install Node.js dependencies
npm install

# Or using yarn
yarn install
```

### 5. Set Up Backend Server

```bash
cd backend
pip install -r requirements.txt
```

## 🚀 Quick Start

### Starting the Application

1. **Start the Backend Server**
```bash
cd backend
python server.py
```

2. **Start the GUI (in a new terminal)**
```bash
npm run dev
# or
yarn dev
```

3. **Open your browser**
Navigate to `http://localhost:3000`

### Creating Your First Project

1. **Project Setup**
   - Click on "Project Setup" in the sidebar
   - Enter a project name
   - Select your images directory (JPEG/PNG files)

2. **Process Data**
   - Navigate to "Data Processing"
   - Select camera model (PINHOLE recommended for most cases)
   - Click "Start COLMAP Processing"
   - Wait for processing to complete

3. **Configure Training**
   - Go to "Configuration"
   - Adjust settings or use defaults
   - Save your configuration

4. **Start Training**
   - Navigate to "Training"
   - Click "Start" to begin training
   - Monitor progress in real-time

5. **Extract Mesh**
   - Go to "Mesh Extraction"
   - Select checkpoint and settings
   - Click "Extract Mesh"
   - Download your 3D model!

## 📁 Project Structure

```
neuralangelo-gui/
├── src/
│   ├── components/
│   │   ├── NeuralAngeloGUI.jsx    # Main GUI component
│   │   ├── ProjectSetup.jsx       # Project configuration
│   │   ├── DataProcessing.jsx     # COLMAP integration
│   │   ├── TrainingPanel.jsx      # Training controls
│   │   └── MeshViewer.jsx         # 3D visualization
│   ├── utils/
│   │   ├── api.js                 # Backend API calls
│   │   ├── fileHandler.js         # File operations
│   │   └── config.js              # Configuration management
│   ├── App.jsx
│   └── index.jsx
├── backend/
│   ├── server.py                  # Flask/FastAPI server
│   ├── colmap_wrapper.py          # COLMAP integration
│   ├── training_manager.py        # Training orchestration
│   └── mesh_extractor.py          # Mesh extraction
├── public/
├── neuralangelo/                  # Neuralangelo submodule
├── package.json
├── README.md
└── LICENSE
```

## ⚙️ Configuration

### Default Training Parameters

```yaml
model:
  type: neuralangelo
  hash_encoding_levels: 16
  
training:
  max_iterations: 500000
  batch_size: 4
  learning_rate: 0.001
  resolution: 1024
  
extraction:
  resolution: 2048
  block_resolution: 128
  threshold: 0.005
```

### Environment Variables

Create a `.env` file in the root directory:

```env
NEURALANGELO_PATH=/path/to/neuralangelo
COLMAP_PATH=/usr/bin/colmap
BACKEND_PORT=5000
GPU_DEVICES=0
MAX_PROJECTS=10
```

## 🎮 Usage Guide

### Data Processing Tab

**COLMAP Settings:**
- **Camera Model**: Choose based on your camera type
  - `PINHOLE`: Standard cameras, no distortion
  - `RADIAL`: Cameras with radial distortion
  - `OPENCV`: Full distortion model
- **Quality**: Higher quality = longer processing time but better results

### Configuration Tab

**Key Parameters:**
- **Max Iterations**: Number of training steps (500k recommended)
- **Resolution**: Training image resolution (1024 is balanced)
- **Batch Size**: Adjust based on GPU VRAM (4 for 12GB, 8 for 24GB)
- **Learning Rate**: 0.001 is a good starting point
- **Hash Encoding Levels**: Higher = more detail but slower (16 default)

### Training Tab

**Monitoring:**
- Watch the loss curve - it should decrease steadily
- Check iteration count and time estimates
- Review logs for errors or warnings
- Save checkpoints regularly

### Mesh Extraction Tab

**Best Practices:**
- Use highest resolution for final export
- Enable post-processing for cleaner meshes
- Export multiple formats for compatibility
- Check mesh statistics before downloading

## 🐛 Troubleshooting

### Common Issues

**"CUDA out of memory"**
- Reduce batch size in Configuration
- Lower training resolution
- Close other GPU applications

**"COLMAP failed to process images"**
- Ensure images have sufficient overlap
- Try different camera model
- Check image quality and lighting

**"Training loss not decreasing"**
- Verify COLMAP processing was successful
- Check learning rate (try 0.0001 - 0.01)
- Ensure dataset quality is good

**"Mesh extraction produces holes"**
- Lower the extraction threshold
- Increase block resolution
- Train for more iterations

### Getting Help

- 📖 Check the [Wiki](https://github.com/yourusername/neuralangelo-gui/wiki)
- 💬 Join our [Discord](https://discord.gg/yourinvite)
- 🐛 Report bugs via [Issues](https://github.com/yourusername/neuralangelo-gui/issues)
- 📧 Email: support@example.com

## 🗺️ Roadmap

### Current Version (v1.0)
- ✅ Complete GUI interface
- ✅ COLMAP integration
- ✅ Training management
- ✅ Basic mesh extraction

### Planned Features
- [ ] Multi-GPU training support
- [ ] Advanced 3D mesh viewer with Three.js
- [ ] Texture map generation
- [ ] Cloud training integration
- [ ] Batch processing multiple scenes
- [ ] Training presets for common scenarios
- [ ] Video input support
- [ ] Real-time reconstruction preview
- [ ] Comparison tools for different settings
- [ ] Export to popular 3D formats (FBX, GLTF, USD)

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Setup

```bash
# Install development dependencies
npm install --dev

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

### Code Style

- Follow the existing code style
- Use ESLint and Prettier
- Write meaningful commit messages
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note**: This GUI is built on top of Neuralangelo, which has its own license. Please review [Neuralangelo's license](https://github.com/NVlabs/neuralangelo/blob/main/LICENSE.txt) before commercial use.

## 🙏 Acknowledgments

- **NVIDIA Research** - For creating [Neuralangelo](https://github.com/NVlabs/neuralangelo)
- **COLMAP** - For camera pose estimation
- **React Community** - For the amazing framework
- **Contributors** - Everyone who has contributed to this project

## 📚 Citation

If you use this software in your research, please cite both this project and the original Neuralangelo paper:

```bibtex
@inproceedings{li2023neuralangelo,
  title={Neuralangelo: High-Fidelity Neural Surface Reconstruction},
  author={Li, Zhaoshuo and M\"uller, Thomas and Evans, Alex and Taylor, Russell H and Unberath, Mathias and Liu, Ming-Yu and Lin, Chen-Hsuan},
  booktitle={IEEE Conference on Computer Vision and Pattern Recognition (CVPR)},
  year={2023}
}
```

## 📞 Contact

- **Project Maintainer**: Your Name - [@yourtwitter](https://twitter.com/yourtwitter)
- **Project Link**: [https://github.com/yourusername/neuralangelo-gui](https://github.com/yourusername/neuralangelo-gui)
- **Website**: [https://yourwebsite.com](https://yourwebsite.com)

---

<div align="center">

Made with ❤️ by the Neuralangelo GUI Team

⭐ Star us on GitHub — it helps!

[Report Bug](https://github.com/yourusername/neuralangelo-gui/issues) • [Request Feature](https://github.com/yourusername/neuralangelo-gui/issues) • [Documentation](https://github.com/yourusername/neuralangelo-gui/wiki)

</div>