import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setError('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }

    // Check file size (500MB limit)
    if (selectedFile.size > 500 * 1024 * 1024) {
      setError('File size too large. Maximum 500MB allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('video', selectedFile);

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setResult(response.data);
      } else {
        setError(response.data.error || 'Upload failed');
      }
    } catch (error) {
      setError('Network error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>🎬 Video Transcription & Explanation</h1>
      
      <div 
        className={`upload-section ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>📁 Select a video file to transcribe and get an AI explanation</p>
        <input 
          type="file" 
          accept="video/*" 
          onChange={handleFileSelect}
        />
        {selectedFile && (
          <p className="selected-file">Selected: {selectedFile.name}</p>
        )}
        <br />
        <button 
          onClick={handleUpload} 
          disabled={loading}
          className="upload-btn"
        >
          {loading ? 'Processing...' : 'Upload & Process Video'}
        </button>
      </div>
      
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Processing your video... This may take a few minutes.</p>
        </div>
      )}
      
      {result && (
        <div className="result">
          <div className="transcription">
            <h3>📝 Transcription:</h3>
            <p>{result.transcription}</p>
          </div>
          
          <div className="explanation">
            <h3>🤖 AI Explanation:</h3>
            <pre>{result.explanation}</pre>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error">
          ❌ {error}
        </div>
      )}
    </div>
  );
}

export default App;