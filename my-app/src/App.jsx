import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

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
    setSelectedAnswers({});
    setShowResults(false);

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

  const handleAnswerSelect = (questionIndex, selectedOption) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }));
  };

  const checkAnswers = () => {
    setShowResults(true);
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setShowResults(false);
  };

  const getScore = () => {
    if (!result?.mcqs) return 0;
    let correct = 0;
    result.mcqs.forEach((mcq, index) => {
      if (selectedAnswers[index] === mcq.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  return (
    <div className="container">
      <h1>🎬 Video Transcription & MCQ Quiz</h1>
      
      <div 
        className={`upload-section ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>📁 Select a video file to transcribe and get MCQ questions</p>
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
          
          {result.mcqs && result.mcqs.length > 0 && (
            <div className="mcq-section">
              <h3>🤖 MCQ Questions ({result.mcqs.length} questions):</h3>
              
              {showResults && (
                <div className="score-section">
                  <h4>Your Score: {getScore()} / {result.mcqs.length}</h4>
                  <button onClick={resetQuiz} className="reset-btn">
                    Retake Quiz
                  </button>
                </div>
              )}
              
              <div className="questions-container">
                {result.mcqs.map((mcq, index) => (
                  <div key={index} className="mcq-question">
                    <h4>Question {mcq.questionNumber || index + 1}:</h4>
                    <p className="question-text">{mcq.question}</p>
                    
                    <div className="options-container">
                      {mcq.options.map((option, optionIndex) => {
                        const optionLetter = option.charAt(0);
                        const isSelected = selectedAnswers[index] === optionLetter;
                        const isCorrect = mcq.correctAnswer === optionLetter;
                        
                        let optionClass = 'option';
                        if (showResults) {
                          if (isCorrect) {
                            optionClass += ' correct';
                          } else if (isSelected && !isCorrect) {
                            optionClass += ' incorrect';
                          }
                        } else if (isSelected) {
                          optionClass += ' selected';
                        }
                        
                        return (
                          <div 
                            key={optionIndex}
                            className={optionClass}
                            onClick={() => !showResults && handleAnswerSelect(index, optionLetter)}
                          >
                            {option}
                            {showResults && isCorrect && <span className="correct-indicator"> ✓</span>}
                            {showResults && isSelected && !isCorrect && <span className="incorrect-indicator"> ✗</span>}
                          </div>
                        );
                      })}
                    </div>
                    
                    {showResults && (
                      <div className="answer-explanation">
                        <strong>Correct Answer: {mcq.correctAnswer}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {!showResults && (
                <button 
                  onClick={checkAnswers} 
                  className="check-answers-btn"
                  disabled={Object.keys(selectedAnswers).length === 0}
                >
                  Check Answers
                </button>
              )}
            </div>
          )}
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