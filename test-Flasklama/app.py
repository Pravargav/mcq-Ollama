from flask import Flask, request, render_template, jsonify
import whisper
import librosa
import soundfile as sf
import os
import ollama
from pathlib import Path
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Configuration
UPLOAD_FOLDER = './WhisperVideo'
AUDIO_FOLDER = './WhisperVideo/AudioFiles'
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv', 'm4v', 'flv', 'wmv'}

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(AUDIO_FOLDER, exist_ok=True)

# Load Whisper model once when app starts
print("Loading Whisper model...")
whisper_model = whisper.load_model("small.en")
print("Whisper model loaded!")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_audio_from_video(video_path, audio_path, sample_rate=16000):
    """Extract audio from video file using librosa"""
    try:
        y, sr = librosa.load(video_path, sr=sample_rate)
        sf.write(audio_path, y, sr)
        return True
    except Exception as e:
        print(f"Error extracting audio: {e}")
        return False

def transcribe_audio(audio_path):
    """Transcribe audio file using Whisper"""
    try:
        result = whisper_model.transcribe(str(audio_path))
        return result["text"].strip()
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        return None

def get_explanation(text):
    """Get explanation from Gemma model"""
    try:
        response = ollama.chat(
            model="hf.co/asedmammad/gemma-2b-it-GGUF:Q4_K_M",
            messages=[
                {"role": "user", "content": f"Give 5 mcqs with 4 options each based on given text:  {text[:500]}"}
            ]
        )
        return response['message']['content']
    except Exception as e:
        print(f"Error getting explanation: {e}")
        return "Error: Could not generate explanation"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file selected'})
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No video file selected'})
    
    if file and allowed_file(file.filename):
        try:
            # Save uploaded video
            filename = secure_filename(file.filename)
            video_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(video_path)
            
            # Extract audio
            file_stem = Path(filename).stem
            audio_path = os.path.join(AUDIO_FOLDER, f"{file_stem}.wav")
            
            if not extract_audio_from_video(video_path, audio_path):
                return jsonify({'error': 'Failed to extract audio from video'})
            
            # Transcribe audio
            transcription = transcribe_audio(audio_path)
            if transcription is None:
                return jsonify({'error': 'Failed to transcribe audio'})
            
            # Get explanation from Gemma
            explanation = get_explanation(transcription)
            
            # Clean up files
            os.remove(video_path)
            os.remove(audio_path)
            
            return jsonify({
                'success': True,
                'transcription': transcription,
                'explanation': explanation
            })
            
        except Exception as e:
            return jsonify({'error': f'Processing failed: {str(e)}'})
    
    return jsonify({'error': 'Invalid file type'})

if __name__ == '__main__':
    app.run(debug=True,port=5001)