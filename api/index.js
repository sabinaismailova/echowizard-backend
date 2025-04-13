import express from "express";
import cors from "cors";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import "dotenv/config";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import {
  uploadToAssemblyAI,
  startTranscription,
  pollTranscription,
  getSentences,
  formatTime,
} from "../helpers/assembly.js";
import { downloadYoutubeAsMp3 } from "../helpers/downloadYoutube.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const upload = multer({
  dest: "uploads/",
});

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.use(express.json());

const allowedOrigins = ['https://echowizard-frontend.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

//POST - generate and return the summary of the contents of audio file
app.post("/summarize-upload", upload.single("audio"), async (req, res) => {
  try {
    const { youtubeUrl } = req.body;
    let filePath;
    const mimeType = "audio/mpeg";

    if (youtubeUrl) {
      filePath = await downloadYoutubeAsMp3(youtubeUrl);
    } else {
      filePath = path.join(__dirname, req.file.path);
    }

    const uploadUrl = await uploadToAssemblyAI(filePath);
    const transcriptId = await startTranscription(uploadUrl);
    const transcript = await pollTranscription(transcriptId);
    const sentences = await getSentences(transcriptId);

    const uploadedFile = await gemini.files.upload({
      file: filePath,
      config: {
        mimeType,
      },
    });

    const structuredTranscript = sentences
      .map(
        (u) =>
          `[${formatTime(u.start)} - ${formatTime(u.end)}] ${u.speaker}: ${
            u.text
          }`
      )
      .join("\n");

    const prompt = `
      You are a helpful assistant.
      
      Please generate a summary of the contents of the audio with accurate time references (e.g., [00:05 - 00:10]) for where you got your information from.
      
      Use the audio's timestamped transcript below to get accurate timestamps. The time references should be at the end of sentences like how citing is done on a research paper.
      
      Transcript: ${structuredTranscript}

      Please return the summary in this structure: 

      Key Topics Covered: (a list of all the topics that were covered in the audio)

      Summary: (the summary of the contents of the audio)

      Action Items: (only include this if there are any action items based on the audio content)

      Suggested Follow-up Questions: (any follow questions that would help the user based on the audio content)
    `;

    const response = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
        createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
        prompt,
      ]),
    });

    fs.unlinkSync(filePath);

    res.json({
      summary: response.text,
      fileUri: uploadedFile.uri,
      mimeType,
      transcript: structuredTranscript,
    });
  } catch (err) {
    console.error("Error processing audio:", err);
    res.status(500).json({
      error: "Failed to process audio",
      details: err.message,
    });
  }
});

//POST - generate answers to any questions user asks about the audio
app.post("/answer", upload.none(), async (req, res) => {
  try {
    const { fileUri, transcript, mimeType, question } = req.body;

    if (!fileUri || !mimeType || !question) {
      return res.status(400).json({
        error: "Missing fileUri, mimeType, or question.",
      });
    }

    const prompt = `
      You are a helpful assistant. 
    
      Please answer the user’s question based on the content of the audio file with accurate time references (e.g., [00:05 - 00:10]) for where you got your information from.

      Use the audio's timestamped transcript below to get accurate timestamps. The time references should be at the end of sentences like how citing is done on a research paper.
      
      Here is the transcript: ${transcript}
    
      Here is the question: ${question}

      If the question cannot be answered with the contents of the audio, then let the user know and provide a short answer to the question while specifying that the answer is not based on the audio. 
    `;
    
    const response = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
        createPartFromUri(fileUri, mimeType),
        prompt,
      ]),
    });

    console.log(response.text);
    res.json(response.text);
  } catch (err) {
    console.error("Error processing local audio:", err);
    res.status(500).json({
      err: "Failed to answer question",
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
