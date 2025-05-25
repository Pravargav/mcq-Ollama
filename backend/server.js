const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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

// MCQ Schema
const mcqSchema = new mongoose.Schema({
  questionNumber: Number,
  question: String,
  options: [String],
  correctAnswer: String,
});

// Updated MongoDB Schema
const transcriptionSchema = new mongoose.Schema({
  fileName: String,
  fileSize: Number,
  transcription: String,
  mcqs: [mcqSchema], // Changed from explanation to mcqs array
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

// Function to parse MCQs from explanation text
function parseMCQsFromExplanation(explanationText) {
  console.log('==========================================');
  console.log('Starting MCQ parsing...');
  console.log('Input explanation text:', explanationText);
  console.log('==========================================');
  
  const mcqs = [];
  
  if (!explanationText || typeof explanationText !== 'string') {
    console.log('No valid explanation text provided');
    return mcqs;
  }
  
  let questionParts = [];
  
  // Pattern 1: Split by numbered questions (1., 2., 3., etc.)
  if (explanationText.match(/\d+\./)) {
    console.log('Using Pattern 1: Split by numbered questions');
    questionParts = explanationText.split(/(?=\d+\.)/);
  }
  // Pattern 2: Split by "Question" keyword
  else if (explanationText.toLowerCase().includes('question')) {
    console.log('Using Pattern 2: Split by "Question" keyword');
    questionParts = explanationText.split(/(?=question\s*\d*)/i);
  }
  // Pattern 3: Split by double newlines
  else if (explanationText.includes('\n\n')) {
    console.log('Using Pattern 3: Split by double newlines');
    questionParts = explanationText.split('\n\n');
  }
  // Pattern 4: If no clear pattern, treat the whole text as one question
  else {
    console.log('Using Pattern 4: Single question');
    questionParts = [explanationText];
  }
  
  console.log('Question parts:', questionParts);
  
  questionParts.forEach((part, index) => {
    const trimmedPart = part.trim();
    if (!trimmedPart) {
      console.log(`Part ${index}: EMPTY - skipping`);
      return;
    }
    
    console.log(`\n--- Processing part ${index} ---`);
    console.log('Trimmed part:', JSON.stringify(trimmedPart));
    
    // Try to extract question number
    let questionNumber = index + 1;
    const questionNumberMatch = trimmedPart.match(/^(\d+)/); // Just match any digit at start
    if (questionNumberMatch) {
      questionNumber = parseInt(questionNumberMatch[1]);
      console.log('Found question number:', questionNumber);
    }
    
    // Remove the question number from the beginning
    let contentWithoutNumber = trimmedPart.replace(/^\d+\.?/, '').trim();
    console.log('Content without number:', JSON.stringify(contentWithoutNumber));
    
    // Split into lines to separate question from options
    const lines = contentWithoutNumber.split('\n').map(line => line.trim()).filter(line => line);
    console.log('Lines after splitting:', lines);
    
    if (lines.length === 0) {
      console.log('No lines found - skipping');
      return;
    }
    
    const question = lines[0];
    console.log('Question text:', question);
    
    const options = [];
    let correctAnswer = '';
    
    // Extract options - be more flexible with patterns
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      console.log(`Checking line ${i}:`, line);
      
      // Pattern for A), B), C), D)
      let optionMatch = line.match(/^([A-Z])\)\s*(.+)$/);
      // Pattern for A., B., C., D.
      if (!optionMatch) optionMatch = line.match(/^([A-Z])\.\s*(.+)$/);
      // Pattern for a), b), c), d)
      if (!optionMatch) optionMatch = line.match(/^([a-z])\)\s*(.+)$/);
      // Pattern for a., b., c., d.
      if (!optionMatch) optionMatch = line.match(/^([a-z])\.\s*(.+)$/);
      
      if (optionMatch) {
        const optionLetter = optionMatch[1].toUpperCase();
        const optionText = optionMatch[2];
        const fullOption = `${optionLetter}) ${optionText}`;
        options.push(fullOption);
        console.log('Found option:', fullOption);
        
        // Check if this option is marked as correct
        if (line.toLowerCase().includes('correct') || line.includes('✓') || line.includes('*')) {
          correctAnswer = optionLetter;
          console.log('Marked as correct answer:', correctAnswer);
        }
      } else if (line.toLowerCase().includes('answer:') || line.toLowerCase().includes('correct:')) {
        // Extract correct answer
        const answerMatch = line.match(/(?:answer|correct):\s*([A-Za-z])/i);
        if (answerMatch) {
          correctAnswer = answerMatch[1].toUpperCase();
          console.log('Found correct answer:', correctAnswer);
        }
      } else {
        console.log('Line did not match any option pattern');
      }
    }
    
    // If no options found, create a simple true/false question
    if (options.length === 0 && question) {
      options.push('A) True', 'B) False');
      correctAnswer = 'A';
      console.log('No options found - created default True/False options');
    }
    
    if (question && options.length > 0) {
      const mcqObject = {
        questionNumber,
        question,
        options,
        correctAnswer: correctAnswer || 'A'
      };
      
      console.log('✅ Created MCQ:', mcqObject);
      mcqs.push(mcqObject);
    } else {
      console.log('❌ Could not create MCQ - missing question or options');
    }
  });
  
  console.log('==========================================');
  console.log('Final MCQs array:');
  mcqs.forEach((mcq, index) => {
    console.log(`MCQ ${index + 1}:`, JSON.stringify(mcq, null, 2));
  });
  console.log('Total MCQs created:', mcqs.length);
  console.log('==========================================');
  
  // If no MCQs found, create a default one from the explanation
  if (mcqs.length === 0 && explanationText.trim()) {
    console.log('No MCQs found - creating default question');
    const defaultMcq = {
      questionNumber: 1,
      question: "Based on the video content: " + explanationText.substring(0, 200) + (explanationText.length > 200 ? "..." : ""),
      options: ['A) True', 'B) False', 'C) Partially True', 'D) Cannot Determine'],
      correctAnswer: 'A'
    };
    mcqs.push(defaultMcq);
    console.log('Created default MCQ:', JSON.stringify(defaultMcq, null, 2));
  }
  
  return mcqs;
}

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
      timeout: 2000000, // 33+ minutes timeout
    });

    const processingTime = Date.now() - startTime;

    if (flaskResponse.data.success) {
      // Parse MCQs from explanation
      const mcqs = parseMCQsFromExplanation(flaskResponse.data.explanation);
      
      // Save to MongoDB
      const transcriptionRecord = new Transcription({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        transcription: flaskResponse.data.transcription,
        mcqs: mcqs, // Store parsed MCQs instead of raw explanation
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
        mcqs: mcqs, // Send MCQs array instead of explanation
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