import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, FolderOpen, Save, Settings, Database, Cpu, Box, Eye, AlertCircle, CheckCircle, Loader, Upload, Download, Trash2, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const NeuralAngeloGUI = () => {
  const [activeTab, setActiveTab] = useState('setup');
  const [projectPath, setProjectPath] = useState('');
  const [datasetPath, setDatasetPath] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [currentLoss, setCurrentLoss] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const fileInputRef = useRef(null);
  
  const [config, setConfig] = useState({
    scene_name: 'my_scene',
    max_iter: 500000,
    resolution: 1024,
    model_type: 'neuralangelo',
    hash_encoding_levels: 16,
    learning_rate: 0.001,
    batch_size: 4,
  });

  const [colmapConfig, setColmapConfig] = useState({
    camera_model: 'PINHOLE',
    quality: 'high',
    dense_reconstruction: true,
    generate_point_cloud: true,
  });

  const [meshConfig, setMeshConfig] = useState({
    checkpoint: 'latest',
    resolution: 2048,
    block_resolution: 128,
    threshold: 0.005,
    export_formats: ['ply', 'obj'],
  });

  const [advancedSettings, setAdvancedSettings] = useState({
    coarse_to_fine: true,
    progressive_encoding: true,
    appearance_embedding: false,
    save_checkpoints: true,
  });

  const [postProcessing, setPostProcessing] = useState({
    remove_disconnected: true,
    smooth_mesh: true,
    decimate: false,
    export_textures: true,
  });

  const tabs = [
    { id: 'setup', name: 'Project Setup', icon: FolderOpen },
    { id: 'process', name: 'Data Processing', icon: Database },
    { id: 'config', name: 'Configuration', icon: Settings },
    { id: 'train', name: 'Training', icon: Cpu },
    { id: 'extract', name: 'Mesh Extraction', icon: Box },
    { id: 'visualize', name: 'Results', icon: Eye },
  ];

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    api.connectWebSocket(handleWebSocketMessage);
    loadProjects();
    
    return () => {
      api.disconnectWebSocket();
    };
  }, []);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'training_progress':
        const progress = (data.data.iteration / config.max_iter) * 100;
        setTrainingProgress(progress);
        setCurrentIteration(data.data.iteration);
        setCurrentLoss(data.data.loss);
        addLog(`Iteration ${data.data.iteration}, Loss: ${data.data.loss.toFixed(4)}`, 'info');
        break;
      
      case 'training_log':
        addLog(data.message, 'info');
        break;
      
      case 'training_complete':
        setIsTraining(false);
        setTrainingProgress(100);
        addLog('Training completed successfully!', 'success');
        break;
      
      case 'training_error':
        setIsTraining(false);
        addLog(`Training error: ${data.message}`, 'error');
        break;
      
      case 'colmap_status':
        setProcessingStatus(data.status);
        addLog(data.message, data.status === 'error' ? 'error' : 'info');
        break;
      
      case 'extraction_status':
        addLog(data.message, data.status === 'error' ? 'error' : 'info');
        break;
    }
  };

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const loadProjects = async () => {
    try {
      const response = await api.listProjects();
      setProjects(response.projects);
    } catch (error) {
      addLog(`Failed to load projects: ${error.message}`, 'error');
    }
  };

  const handleCreateProject = async () => {
    try {
      addLog('Creating project...', 'info');
      await api.createProject({
        ...config,
        project_path: projectPath,
        dataset_path: datasetPath,
      });
      addLog('Project created successfully!', 'success');
      await loadProjects();
    } catch (error) {
      addLog(`Failed to create project: ${error.message}`, 'error');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUploadImages = async () => {
    if (selectedFiles.length === 0) {
      addLog('Please select images first', 'error');
      return;
    }
    
    try {
      addLog(`Uploading ${selectedFiles.length} images...`, 'info');
      await api.uploadImages(config.scene_name, selectedFiles);
      addLog('Images uploaded successfully!', 'success');
      setSelectedFiles([]);
    } catch (error) {
      addLog(`Failed to upload images: ${error.message}`, 'error');
    }
  };

  const handleProcessData = async () => {
    try {
      setProcessingStatus('processing');
      addLog('Starting COLMAP processing...', 'info');
      await api.startColmapProcessing(config.scene_name, colmapConfig);
    } catch (error) {
      setProcessingStatus('error');
      addLog(`COLMAP processing failed: ${error.message}`, 'error');
    }
  };

  const handleStartTraining = async () => {
    try {
      setIsTraining(true);
      addLog('Starting training...', 'info');
      await api.startTraining(config.scene_name, config);
    } catch (error) {
      setIsTraining(false);
      addLog(`Failed to start training: ${error.message}`, 'error');
    }
  };

  const handlePauseTraining = async () => {
    try {
      await api.pauseTraining(config.scene_name);
      addLog('Training paused', 'info');
    } catch (error) {
      addLog(`Failed to pause training: ${error.message}`, 'error');
    }
  };

  const handleStopTraining = async () => {
    try {
      await api.stopTraining(config.scene_name);
      setIsTraining(false);
      addLog('Training stopped', 'info');
    } catch (error) {
      addLog(`Failed to stop training: ${error.message}`, 'error');
    }
  };

  const handleExtractMesh = async () => {
    try {
      addLog('Starting mesh extraction...', 'info');
      await api.extractMesh(config.scene_name, {
        ...meshConfig,
        post_process: postProcessing.remove_disconnected || postProcessing.smooth_mesh,
      });
    } catch (error) {
      addLog(`Failed to extract mesh: ${error.message}`, 'error');
    }
  };

  const handleDownloadMesh = () => {
    api.downloadMesh(config.scene_name);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-blue-400">Neuralangelo</h1>
          <p className="text-sm text-gray-400 mt-1">3D Reconstruction Studio</p>
        </div>
        
        <nav className="flex-1 p-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon size={20} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${isTraining ? 'bg-green-500' : 'bg-gray-600'}`}></div>
              <span>{isTraining ? 'Training Active' : 'Idle'}</span>
            </div>
            <div>Version 1.0.0</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-8">
          {/* Project Setup Tab */}
          {activeTab === 'setup' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold mb-6">Project Setup</h2>
              
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <FolderOpen className="mr-2" size={24} />
                  Project Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Project Name</label>
                    <input
                      type="text"
                      value={config.scene_name}
                      onChange={(e) => setConfig({...config, scene_name: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      placeholder="Enter project name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Project Directory</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={projectPath}
                        onChange={(e) => setProjectPath(e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Select project directory"
                      />
                      <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center">
                        <FolderOpen size={18} className="mr-2" />
                        Browse
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload Images</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Upload size={18} className="mr-2" />
                        Select Images ({selectedFiles.length} selected)
                      </button>
                      <button 
                        onClick={handleUploadImages}
                        disabled={selectedFiles.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
                      >
                        Upload
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Select folder containing your images (.jpg, .png)
                    </p>
                  </div>

                  <button
                    onClick={handleCreateProject}
                    className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg transition-colors font-semibold"
                  >
                    Create Project
                  </button>
                </div>
              </div>

              {projects.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">Recent Projects</h3>
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <div key={project.name} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                        <span>{project.name}</span>
                        <button 
                          onClick={() => setConfig({...config, scene_name: project.name})}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mt-6">
                <div className="flex items-start">
                  <AlertCircle className="text-blue-400 mr-3 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-300 mb-1">Getting Started</p>
                    <p className="text-gray-300">
                      Create a new project and select your image directory. Then proceed to Data Processing to run COLMAP for camera pose estimation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Processing Tab */}
          {activeTab === 'process' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold mb-6">Data Processing</h2>
              
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">COLMAP Processing</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Camera Model</label>
                      <select 
                        value={colmapConfig.camera_model}
                        onChange={(e) => setColmapConfig({...colmapConfig, camera_model: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="PINHOLE">PINHOLE</option>
                        <option value="RADIAL">RADIAL</option>
                        <option value="OPENCV">OPENCV</option>
                        <option value="SIMPLE_RADIAL">SIMPLE_RADIAL</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Quality</label>
                      <select 
                        value={colmapConfig.quality}
                        onChange={(e) => setColmapConfig({...colmapConfig, quality: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4"
                        checked={colmapConfig.dense_reconstruction}
                        onChange={(e) => setColmapConfig({...colmapConfig, dense_reconstruction: e.target.checked})}
                      />
                      <span className="text-sm">Run dense reconstruction</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4"
                        checked={colmapConfig.generate_point_cloud}
                        onChange={(e) => setColmapConfig({...colmapConfig, generate_point_cloud: e.target.checked})}
                      />
                      <span className="text-sm">Generate point cloud</span>
                    </label>
                  </div>
                </div>
                
                <button
                  onClick={handleProcessData}
                  disabled={processingStatus === 'processing'}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg transition-colors flex items-center justify-center font-semibold"
                >
                  {processingStatus === 'processing' ? (
                    <>
                      <Loader className="animate-spin mr-2" size={20} />
                      Processing...
                    </>
                  ) : processingStatus === 'complete' ? (
                    <>
                      <CheckCircle className="mr-2" size={20} />
                      Processing Complete
                    </>
                  ) : (
                    <>
                      <Play className="mr-2" size={20} />
                      Start COLMAP Processing
                    </>
                  )}
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Processing Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Feature Extraction</span>
                    <CheckCircle className={processingStatus === 'complete' ? 'text-green-500' : 'text-gray-600'} size={20} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Feature Matching</span>
                    <CheckCircle className={processingStatus === 'complete' ? 'text-green-500' : 'text-gray-600'} size={20} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sparse Reconstruction</span>
                    <CheckCircle className={processingStatus === 'complete' ? 'text-green-500' : 'text-gray-600'} size={20} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dense Reconstruction</span>
                    <CheckCircle className={processingStatus === 'complete' ? 'text-green-500' : 'text-gray-600'} size={20} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold mb-6">Training Configuration</h2>
              
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Model Settings</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Model Type</label>
                      <select 
                        value={config.model_type}
                        onChange={(e) => setConfig({...config, model_type: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="neuralangelo">Neuralangelo (Default)</option>
                        <option value="neuralangelo-dense">Neuralangelo Dense</option>
                        <option value="instant-ngp">Instant-NGP</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Iterations</label>
                      <input
                        type="number"
                        value={config.max_iter}
                        onChange={(e) => setConfig({...config, max_iter: parseInt(e.target.value)})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Resolution</label>
                      <select
                        value={config.resolution}
                        onChange={(e) => setConfig({...config, resolution: parseInt(e.target.value)})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="512">512</option>
                        <option value="1024">1024</option>
                        <option value="2048">2048</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Batch Size</label>
                      <input
                        type="number"
                        value={config.batch_size}
                        onChange={(e) => setConfig({...config, batch_size: parseInt(e.target.value)})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Learning Rate</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={config.learning_rate}
                        onChange={(e) => setConfig({...config, learning_rate: parseFloat(e.target.value)})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Hash Encoding Levels</label>
                      <input
                        type="number"
                        value={config.hash_encoding_levels}
                        onChange={(e) => setConfig({...config, hash_encoding_levels: parseInt(e.target.value)})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Advanced Settings</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      checked={advancedSettings.coarse_to_fine}
                      onChange={(e) => setAdvancedSettings({...advancedSettings, coarse_to_fine: e.target.checked})}
                    />
                    <span className="text-sm">Use coarse-to-fine training</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      checked={advancedSettings.progressive_encoding}
                      onChange={(e) => setAdvancedSettings({...advancedSettings, progressive_encoding: e.target.checked})}
                    />
                    <span className="text-sm">Enable progressive hash encoding</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      checked={advancedSettings.appearance_embedding}
                      onChange={(e) => setAdvancedSettings({...advancedSettings, appearance_embedding: e.target.checked})}
                    />
                    <span className="text-sm">Use appearance embedding</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      checked={advancedSettings.save_checkpoints}
                      onChange={(e) => setAdvancedSettings({...advancedSettings, save_checkpoints: e.target.checked})}
                    />
                    <span className="text-sm">Save checkpoints every 10k iterations</span>
                  </label>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors flex items-center justify-center">
                    <Save className="mr-2" size={18} />
                    Save Configuration
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg transition-colors flex items-center justify-center">
                    <Upload className="mr-2" size={18} />
                    Load Config
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Training Tab */}
          {activeTab === 'train' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold mb-6">Training</h2>
              
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Training Control</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleStartTraining}
                      disabled={isTraining}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition-colors flex items-center"
                    >
                      <Play className="mr-2" size={18} />
                      Start
                    </button>
                    <button
                      onClick={handlePauseTraining}
                      disabled={!isTraining}
                      className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition-colors flex items-center"
                    >
                      <Pause className="mr-2" size={18} />
                      Pause
                    </button>
                    <button
                      onClick={handleStopTraining}
                      disabled={!isTraining}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition-colors flex items-center"
                    >
                      <Square className="mr-2" size={18} />
                      Stop
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Progress</span>
                      <span>{trainingProgress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${trainingProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Iteration</div>
                      <div className="text-2xl font-bold">{currentIteration}</div>
                      <div className="text-xs text-gray-400">/ {config.max_iter.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Loss</div>
                      <div className="text-2xl font-bold">{currentLoss.toFixed(4)}</div>
                      <div className="text-xs text-green-400">↓ decreasing</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Time Remaining</div>
                      <div className="text-2xl font-bold">
                        {isTraining ? '2.5h' : '--'}
                      </div>
                      <div className="text-xs text-gray-400">estimated</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Training Log</h3>
                <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
                  {logs.length === 0 ? (
                    <div className="text-gray-500">No logs yet. Start training to see output...</div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className={`mb-1 ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'success' ? 'text-green-400' :
                        'text-gray-300'
                      }`}>
                        <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mesh Extraction Tab */}
          {activeTab === 'extract' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold mb-6">Mesh Extraction</h2>
              
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Extraction Settings</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Checkpoint</label>
                      <select 
                        value={meshConfig.checkpoint}
                        onChange={(e) => setMeshConfig({...meshConfig, checkpoint: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="latest">Latest (iter {config.max_iter})</option>
                        <option value="400000">Checkpoint (iter 400000)</option>
                        <option value="300000">Checkpoint (iter 300000)</option>
                        <option value="200000">Checkpoint (iter 200000)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Resolution</label>
                      <select 
                        value={meshConfig.resolution}
                        onChange={(e) => setMeshConfig({...meshConfig, resolution: parseInt(e.target.value)})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="2048">2048</option>
                        <option value="1024">1024</option>
                        <option value="512">512</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Block Resolution</label>
                      <input
                        type="number"
                        value={meshConfig.block_resolution}
                        onChange={(e) => setMeshConfig({...meshConfig, block_resolution: parseInt(e.target.value)})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Threshold</label>
                      <input
                        type="number"
                        step="0.001"
                        value={meshConfig.threshold}
                        onChange={(e) => setMeshConfig({...meshConfig, threshold: parseFloat(e.target.value)})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Export Format</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-sm">.ply</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-sm">.obj</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="w-4 h-4" />
                        <span className="text-sm">.glb</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleExtractMesh}
                  className="w-full mt-6 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-colors flex items-center justify-center font-semibold"
                >
                  <Box className="mr-2" size={20} />
                  Extract Mesh
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Post-Processing</h3>
                
                <div className="space-y-3 mb-6">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      checked={postProcessing.remove_disconnected}
                      onChange={(e) => setPostProcessing({...postProcessing, remove_disconnected: e.target.checked})}
                    />
                    <span className="text-sm">Remove disconnected components</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      checked={postProcessing.smooth_mesh}
                      onChange={(e) => setPostProcessing({...postProcessing, smooth_mesh: e.target.checked})}
                    />
                    <span className="text-sm">Smooth mesh surface</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      checked={postProcessing.decimate}
                      onChange={(e) => setPostProcessing({...postProcessing, decimate: e.target.checked})}
                    />
                    <span className="text-sm">Decimate mesh (reduce polygons)</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      checked={postProcessing.export_textures}
                      onChange={(e) => setPostProcessing({...postProcessing, export_textures: e.target.checked})}
                    />
                    <span className="text-sm">Export texture maps</span>
                  </label>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Extracted Meshes</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-600">
                      <span>my_scene_mesh.ply</span>
                      <div className="flex space-x-2">
                        <button 
                          onClick={handleDownloadMesh}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Download size={16} />
                        </button>
                        <button className="text-red-400 hover:text-red-300">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visualization Tab */}
          {activeTab === 'visualize' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold mb-6">Results & Visualization</h2>
              
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center text-gray-500">
                    <Box size={64} className="mx-auto mb-4 opacity-50" />
                    <p>3D Mesh Viewer</p>
                    <p className="text-sm mt-2">Load a mesh to visualize</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
                    Load Mesh
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
                    <RefreshCw size={18} />
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
                    Screenshot
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Mesh Statistics</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vertices:</span>
                      <span className="font-mono">1,234,567</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Faces:</span>
                      <span className="font-mono">2,469,134</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">File Size:</span>
                      <span className="font-mono">125.4 MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bounding Box:</span>
                      <span className="font-mono">2.5 x 1.8 x 1.2</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Training Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Iterations:</span>
                      <span className="font-mono">{config.max_iter.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Final Loss:</span>
                      <span className="font-mono">{currentLoss > 0 ? currentLoss.toFixed(4) : '0.0089'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Training Time:</span>
                      <span className="font-mono">4h 23m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">GPU Used:</span>
                      <span className="font-mono">NVIDIA RTX 4090</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Export Options</h3>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleDownloadMesh}
                    className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Download className="mr-2" size={18} />
                    Download Mesh
                  </button>
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg transition-colors flex items-center justify-center">
                    <Download className="mr-2" size={18} />
                    Download Project
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NeuralAngeloGUI;