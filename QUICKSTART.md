# Quick Start Guide

Get up and running with your first 3D reconstruction in 10 minutes!

## Prerequisites

- Completed [INSTALLATION.md](INSTALLATION.md)
- Have 20-50 images of an object/scene ready
- Backend and frontend servers running

## Your First Project (5-10 minutes)

### Step 1: Launch the Application (30 seconds)

**Terminal 1 - Backend:**
```bash
conda activate neuralangelo
cd backend
python server.py
```

**Terminal 2 - Frontend:**
```bash
cd neuralangelo-gui
npm run dev
```

**Browser:**
Open `http://localhost:3000`

### Step 2: Create Project (1 minute)

1. Go to **Project Setup** tab
2. Enter a project name (e.g., "my_first_scan")
3. Click **Select Images**
4. Choose 20-50 photos of your object
5. Click **Upload** 
6. Click **Create Project**

✅ **Success:** You'll see "Project created successfully!" in the logs

### Step 3: Process Images (2-5 minutes)

1. Go to **Data Processing** tab
2. Click **Start COLMAP Processing**
3. Wait for:
   - ✓ Feature Extraction
   - ✓ Feature Matching
   - ✓ Sparse Reconstruction
   - ✓ Dense Reconstruction

⏱️ **Time:** ~3-5 minutes for 30 images

✅ **Success:** All checkmarks turn green

### Step 4: Configure Training (30 seconds)

1. Go to **Configuration** tab
2. For quick testing, reduce iterations:
   - Max Iterations: `10000` (instead of 500000)
   - Resolution: `512` (for speed)
   - Batch Size: `4`
3. Other settings: leave as default

💡 **Tip:** Lower iterations = faster but lower quality. Use for testing only!

### Step 5: Start Training (2-30 minutes)

1. Go to **Training** tab
2. Click **Start**
3. Watch real-time progress:
   - Iteration counter
   - Loss value (should decrease)
   - Training logs

⏱️ **Time:** 
- 10k iterations: ~2-3 minutes
- 500k iterations: ~2-4 hours

✅ **Success:** Progress bar reaches 100%, "Training completed!" appears

### Step 6: Extract Mesh (1 minute)

1. Go to **Mesh Extraction** tab
2. Settings:
   - Checkpoint: `latest`
   - Resolution: `2048`
3. Click **Extract Mesh**
4. Wait for processing

✅ **Success:** "Mesh extraction completed!" appears

### Step 7: Download Result (10 seconds)

1. Go to **Results** tab
2. Click **Download Mesh**
3. Your 3D model downloads! (.ply, .obj)

🎉 **Congratulations!** You've created your first 3D reconstruction!

## What's Next?

### For Better Results:

1. **Take Better Photos:**
   - 50-100 images
   - Complete coverage (360° around object)
   - Good lighting, no motion blur
   - Overlap between images (60-80%)

2. **Use Full Training:**
   - Max Iterations: `500000`
   - Resolution: `1024` or `2048`
   - Let it train for 2-4 hours

3. **Post-Process:**
   - Use mesh editing software (Blender, MeshLab)
   - Clean up artifacts
   - Add textures

### Recommended Image Capture Tips:

**For Objects:**
- Place object on a turntable
- Fixed camera, rotate object
- Or: fixed object, move camera in circle
- 36-72 images (every 5-10 degrees)

**For Scenes:**
- Walk around capturing images
- Keep 60-80% overlap
- Include both wide and close-up shots
- 50-150 images depending on scene size

**Camera Settings:**
- Auto-focus OFF (use manual focus)
- High resolution (12MP+)
- Good lighting (avoid harsh shadows)
- No motion blur

## Example Workflow Times

### Quick Test (Low Quality)
- Images: 20-30
- COLMAP: 2-3 min
- Training: 10k iterations (2-3 min)
- Total: ~10 minutes
- Quality: ⭐⭐☆☆☆ (Good for testing)

### Standard Quality
- Images: 50-70
- COLMAP: 5-10 min
- Training: 100k iterations (20-30 min)
- Total: ~45 minutes
- Quality: ⭐⭐⭐⭐☆ (Good results)

### High Quality
- Images: 80-150
- COLMAP: 10-20 min
- Training: 500k iterations (2-4 hours)
- Total: ~3-5 hours
- Quality: ⭐⭐⭐⭐⭐ (Publication quality)

## Common First-Time Issues

### "COLMAP failed"
**Cause:** Not enough image overlap or poor quality images
**Fix:** Retake photos with more overlap

### "Loss not decreasing"
**Cause:** Bad COLMAP reconstruction
**Fix:** Check COLMAP output, may need better images

### "Mesh has holes"
**Cause:** Incomplete image coverage
**Fix:** Take more photos from missing angles

### "Out of memory"
**Cause:** Batch size too high or resolution too high
**Fix:** Lower batch size to 2 or resolution to 512

## Viewing Your 3D Model

### Free Software Options:

**MeshLab** (Recommended for beginners)
```bash
sudo apt-get install meshlab
meshlab your_mesh.ply
```

**Blender** (Advanced editing)
```bash
sudo snap install blender --classic
blender
# File → Import → PLY
```

**Online Viewers:**
- https://3dviewer.net
- https://mesh.github.io

### What You Can Do:

- View from all angles
- Measure dimensions
- Export to other formats
- Clean up artifacts
- Add colors/textures
- 3D print

## Project Examples

### Example 1: Small Object (Coffee Mug)
```
Images: 36 (10° increments, turntable)
COLMAP: 2 minutes
Training: 100k iterations (20 min)
Result: Clean 3D model, suitable for 3D printing
```

### Example 2: Room Interior
```
Images: 120 (walking around room)
COLMAP: 15 minutes
Training: 500k iterations (3 hours)
Result: Detailed room reconstruction
```

### Example 3: Outdoor Statue
```
Images: 80 (walking around, multiple heights)
COLMAP: 10 minutes
Training: 300k iterations (1 hour)
Result: High-quality statue scan
```

## Tips for Success

### 📸 Photography
- ✅ Use a good camera or recent smartphone
- ✅ Consistent lighting
- ✅ Focus on the object (not background)
- ✅ Disable auto-focus
- ❌ Avoid reflective surfaces
- ❌ Don't move too fast (no blur)

### ⚙️ Configuration
- ✅ Start with default settings
- ✅ Adjust based on GPU memory
- ✅ Use lower iterations for testing
- ❌ Don't change too many things at once

### 🚀 Training
- ✅ Monitor loss - should decrease
- ✅ Let it run completely
- ✅ Save checkpoints
- ❌ Don't stop training too early

## Getting Help

Stuck? Here's how to get help:

1. **Check Logs:** Read the training log for errors
2. **Documentation:** Re-read relevant section
3. **Discord:** Ask in #support channel
4. **GitHub:** Search existing issues
5. **Create Issue:** Include error logs and screenshots

## Ready for More?

Once comfortable with basics:

1. Read full [README.md](README.md)
2. Explore advanced configuration options
3. Try different scenes and objects
4. Experiment with parameters
5. Share your results!

---

**Need Help?** Join our [Discord](https://discord.gg/yourinvite) or open an [issue](https://github.com/yourusername/neuralangelo-gui/issues)

Happy reconstructing! 🎨🔬
