// API client for Neuralangelo GUI

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

class NeuralAngeloAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.wsURL = WS_URL;
    this.ws = null;
    this.wsCallbacks = [];
  }

  // WebSocket connection
  connectWebSocket(onMessage) {
    this.ws = new WebSocket(this.wsURL);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
      
      // Call registered callbacks
      this.wsCallbacks.forEach(callback => callback(data));
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => this.connectWebSocket(onMessage), 3000);
    };
    
    return this.ws;
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  addWebSocketCallback(callback) {
    this.wsCallbacks.push(callback);
  }

  removeWebSocketCallback(callback) {
    this.wsCallbacks = this.wsCallbacks.filter(cb => cb !== callback);
  }

  // HTTP request helper
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Project Management
  async createProject(config) {
    return this.request('/api/projects/create', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async listProjects() {
    return this.request('/api/projects');
  }

  async getProjectStatus(projectName) {
    return this.request(`/api/projects/${projectName}/status`);
  }

  async uploadImages(projectName, files) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const url = `${this.baseURL}/api/projects/${projectName}/upload-images`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload images');
    }

    return await response.json();
  }

  // COLMAP Processing
  async startColmapProcessing(projectName, config) {
    return this.request(`/api/projects/${projectName}/process-colmap`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Training
  async startTraining(projectName, config) {
    return this.request(`/api/projects/${projectName}/train`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async pauseTraining(projectName) {
    return this.request(`/api/projects/${projectName}/train/pause`, {
      method: 'POST',
    });
  }

  async resumeTraining(projectName) {
    return this.request(`/api/projects/${projectName}/train/resume`, {
      method: 'POST',
    });
  }

  async stopTraining(projectName) {
    return this.request(`/api/projects/${projectName}/train/stop`, {
      method: 'POST',
    });
  }

  // Mesh Extraction
  async extractMesh(projectName, config) {
    return this.request(`/api/projects/${projectName}/extract-mesh`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // File Downloads
  async downloadMesh(projectName) {
    const url = `${this.baseURL}/api/projects/${projectName}/download/mesh`;
    window.open(url, '_blank');
  }

  async downloadConfig(projectName) {
    const url = `${this.baseURL}/api/projects/${projectName}/download/config`;
    window.open(url, '_blank');
  }
}

// Create a singleton instance
const api = new NeuralAngeloAPI();

export default api;