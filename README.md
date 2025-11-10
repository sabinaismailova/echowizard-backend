# EchoWizard Backend 🧙‍♂️

The backend service for **EchoWizard**, an AI-powered tool that transcribes and comprehends audio files (including YouTube videos), then generates intelligent summaries and answers questions with precise timestamps.

---

## 🔧 Tech Stack

- **Node.js + Express** – RESTful API server
- **Google Gemini GenAI** – Audio comprehension (summaries and question answering)
- **AssemblyAI** – Transcription and timestamp extraction
- **yt-dlp** – YouTube audio extraction
- **Multer** – File upload handling

---

## ✨ Features

- Upload audio files or provide a YouTube video URL
- Transcribe audio with sentence-level timestamps
- Generate detailed summaries with cited timestamps
- Ask follow-up questions and receive timestamped answers
- Automatically deletes temporary files after processing

---

## 🔌 API Endpoints

### `POST /summarize-upload`

**Description**: Upload an audio file or provide a YouTube URL to receive a timestamped transcript and structured summary.

**Request (multipart/form-data)**:
- `audio` – (optional) an audio file to upload
- `youtubeUrl` – (optional) YouTube video URL to process

**Response**:
```json
{
  "summary": "Structured summary with timestamps",
  "fileUri": "Google Gemini uploaded file URI",
  "mimeType": "audio/mpeg",
  "transcript": "Formatted transcript with timestamps"
}
```

### `POST /answer`

**Description**: Ask a question about an already-processed audio file.

**Request (multipart/form-data)**:
- `fileUri` – The URI returned from /summarize-upload
- `mimeType` – audio/mpeg
- `transcript` - Timestamped transcript from /summarize-upload
- `question` - Your question

**Response**:
```json
"A helpful answer based on the transcript and audio, with timestamps included where relevant."
```

---

## 🧪 Running Locally 

### 1. Clone and install

```bash
git clone https://github.com/your-username/echowizard-backend.git
cd echowizard-backend
npm install
```

### 2. Add your .env

Create a .env file in the root:

```bash
ASSEMBLYAI_API_KEY=your_assemblyai_key
GEMINI_API_KEY=your_google_genai_api_key
PROJECT_ID=your_google_project_id
```

### 3. Start the server

```bash
npm start
```

Server will run at http://localhost:3000

---

## 📁 Project Structure

```
.
├── index.js                 # Main Express app
├── helpers/
│   ├── assembly.js          # Transcription logic
│   └── downloadYoutube.js   # YouTube MP3 downloader
├── tmp/                # Temp audio files
├── .env                     # API keys (not committed)
└── README.md
```

---

## 🧠 Example Flow

Send a YouTube URL or audio file to ```/summarize-upload```

Get back a timestamped transcript and rich summary

Ask specific follow-up questions using ```/answer```

---

## 🪄 Future Ideas

- Support for longer audio files
- Implement OAuth to login and save chat history

---

## 📜 Author
Made with 💡 by Sabina Ismailova for AI Hackfest
