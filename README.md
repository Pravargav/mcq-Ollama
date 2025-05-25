

### 🔄 Full Workflow Overview

1. **Frontend (React + Vite)**

   * Uploads video via form to Express backend.

2. **Backend (Node/Express)**

   * Receives video → stores locally or in-memory.
   * Sends video/audio to Flask for transcription (via HTTP).
   * Receives transcript and sends it as input to **Gemma** (LLM) through Flask.
   * Gets **Gemma's output (e.g. MCQs, summaries, etc.)**.
   * Saves this result in **MongoDB**.
   * Responds to frontend with the LLM output.

3. **Flask (Whisper + Gemma)**

   * Handles transcription (via Whisper).
   * Handles LLM input processing (via Gemma).





---

````markdown
# Video Transcription Backend

This is the Express.js backend for a video transcription application. It handles file uploads, communicates with a Python Flask server for transcription and MCQ generation, and interacts with MongoDB for data storage.

## 📦 Features

- Upload and store MP4 video files
- Transcribe audio via Whisper using a Flask backend
- Generate MCQs from transcripts via local LLM
- Store data using MongoDB
- Supports development with `nodemon`

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/en/download/)
- [npm](https://www.npmjs.com/)
- [MongoDB Atlas account](https://www.mongodb.com/cloud/atlas)
- A running [Flask transcription server](http://localhost:5001)

---

### 🔧 Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/video-transcription-backend.git
   cd video-transcription-backend
````

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Create a `.env` file** in the root directory and add the following environment variables:

   ```env
   MONGODB_URI=your-mongodb-atlas-connection-string
   PORT=5000
   FLASK_SERVER_URL=http://localhost:5001
   NODE_ENV=development
   ```

   Replace `your-mongodb-atlas-connection-string` with your actual MongoDB URI.

---

## 🧪 Scripts

* Start server in production mode:

  ```bash
  npm start
  ```

* Start server in development mode (with auto-reload using nodemon):

  ```bash
  npm run dev
  ```

---

## 📁 Project Structure

```
.
├── server.js          # Main server entry point
├── .env               # Environment variables
├── package.json       # Node.js dependencies and scripts
├── routes/            # Route definitions (optional)
├── controllers/       # Business logic (optional)
└── uploads/           # Uploaded video files
```

---

## 📬 API Endpoints

> ⚠️ API details like routes and response formats should be added here once defined in `server.js`.

---

## 🛠 Development Notes

* Ensure the Flask server is running on the port defined in `FLASK_SERVER_URL`.
* Use tools like [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/) to test API endpoints.
* Ensure MongoDB Atlas IP access list includes your IP address.


Here’s a clean and comprehensive `README.md` for your Flask-based transcription service, including virtual environment setup, dependency installation, and usage instructions.

---

````markdown
# 🎙️ Flask Transcription Server

This is the Flask-based backend service for transcribing MP4 video/audio files using [OpenAI's Whisper](https://github.com/openai/whisper). It integrates with `librosa`, `ffmpeg`, `ollama`, and other audio processing libraries.

---

## 📦 Features

- Transcribes audio from uploaded MP4 files using Whisper
- Uses `ffmpeg-python` for audio extraction
- Audio processing via `librosa` and `soundfile`
- Compatible with Whisper installed via GitHub

---

## 🧰 Prerequisites

Make sure the following are installed:

- Python 3.8+
- [ffmpeg](https://ffmpeg.org/download.html) (must be available in your system PATH)

---

## 🧪 Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/flask-transcription-server.git
cd flask-transcription-server
````

### 2. Create & Activate Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Install Whisper via GitHub

Whisper is not available on PyPI, so install it using:

```bash
pip install git+https://github.com/openai/whisper.git
```

---

## 🛠 Run the Server

```bash
python app.py
```

This will start the Flask server, typically at `http://localhost:5001`.

---

## 🗂️ Project Structure

```
.
├── app.py              # Flask app entry point
├── requirements.txt    # Python dependencies
└── ...                 # Additional helper modules if any
```

---

## 🔗 Endpoints

> Add actual route documentation once implemented in `app.py`, e.g.:

```
POST /transcribe
Content-Type: multipart/form-data
Body: file=<mp4-audio-file>
Response: { "transcript": "..." }
```

---

## ⚠️ Notes

* Ensure `ffmpeg` is installed and accessible via terminal (`ffmpeg -version` should work).
* Keep the virtual environment activated during development and testing.
* You may need to install `torch` manually if Whisper fails due to it.

## 📹 FFmpeg Installation Guide

To install FFmpeg on your system, follow this video tutorial:

👉 **[Watch on YouTube: How to Install FFmpeg (Windows, macOS, Linux)](https://youtu.be/4jx2_j5Seew?si=AWPvfUaWikajrtlg)**



Here's a clean and beginner-friendly `README.md` for your **Vite + React** frontend project, covering installation, development, and build instructions:

---

````markdown
# ⚛️ React App with Vite

This is a modern React.js application bootstrapped with **Vite**, designed for fast development, instant hot module replacement, and a smooth DX (Developer Experience).

---

## 🚀 Features

- ⚡ Blazing fast build with [Vite](https://vitejs.dev/)
- ⚛️ React 19 for modern UI development
- ✅ TypeScript support via type definitions
- 🧹 ESLint setup for code quality

---

## 📦 Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- npm (comes with Node.js)

---

## 🧪 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/my-app.git
cd my-app
````

### 2. Install dependencies

```bash
npm install
```

---

## 💻 Running the App in Development

Start the development server with hot reloading:

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to view the app in your browser.

---

## 🔍 Code Linting

To lint your codebase using ESLint:

```bash
npm run lint
```

---

## 🛠️ Build for Production

Generate a production-ready build in the `dist/` folder:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 📁 Project Structure

```
my-app/
├── public/            # Static assets
├── src/               # React source code
│   ├── App.jsx
│   └── main.jsx
├── .eslintrc.js       # ESLint config
├── index.html
├── package.json
└── vite.config.js     # Vite config
```





