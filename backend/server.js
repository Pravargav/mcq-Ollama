const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Add this line to load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video_transcription';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});

// MongoDB Schema
const transcriptionSchema = new mongoose.Schema({
  fileName: String,
  fileSize: Number,
  transcription: String,
  explanation: String,
  processedAt: { type: Date, default: Date.now },
  processingTime: Number,
});

const Transcription = mongoose.model('Transcription', transcriptionSchema);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/m4v', 'video/x-flv', 'video/x-ms-wmv'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp4|mov|avi|mkv|m4v|flv|wmv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Routes
app.post('/api/upload', upload.single('video'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    console.log('File uploaded:', req.file.filename);

    // Create FormData to send to Flask
    const formData = new FormData();
    const videoStream = fs.createReadStream(req.file.path);
    formData.append('video', videoStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Send video to Flask server
    console.log('Sending video to Flask server...');
    const flaskResponse = await axios.post('http://127.0.0.1:5001/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 2000000, // 5 minutes timeout
    });

    const processingTime = Date.now() - startTime;

    if (flaskResponse.data.success) {
      // Save to MongoDB
      const transcriptionRecord = new Transcription({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        transcription: flaskResponse.data.transcription,
        explanation: flaskResponse.data.explanation,
        processingTime: processingTime,
      });

      await transcriptionRecord.save();
      console.log('Results saved to MongoDB');

      // Clean up uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });

      // Send response back to React
      res.json({
        success: true,
        transcription: flaskResponse.data.transcription,
        explanation: flaskResponse.data.explanation,
        processingTime: processingTime,
        id: transcriptionRecord._id,
      });
    } else {
      // Clean up uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      
      res.status(500).json({ error: flaskResponse.data.error || 'Flask processing failed' });
    }

  } catch (error) {
    console.error('Error processing video:', error.message);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Flask server is not available. Please make sure it is running on port 5001.' });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(408).json({ error: 'Request timed out. The video might be too large or complex to process.' });
    } else {
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }
});

// Get all transcriptions
app.get('/api/transcriptions', async (req, res) => {
  try {
    const transcriptions = await Transcription.find().sort({ processedAt: -1 });
    res.json(transcriptions);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching transcriptions: ' + error.message });
  }
});

// Get specific transcription by ID
app.get('/api/transcriptions/:id', async (req, res) => {
  try {
    const transcription = await Transcription.findById(req.params.id);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    res.json(transcription);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching transcription: ' + error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Express server is running' });
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  console.log('Make sure Flask server is running on port 5001');
});