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
  formatTime,
} from "./helpers/assembly.js";

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

app.use(cors());
app.use(express.json());

//POST - generate and return the summary of the contents of audio file
app.post("/summarize-upload", upload.single("audio"), async (req, res) => {
  try {
    const filePath = path.join(__dirname, req.file.path);
    const mimeType = "audio/mpeg";

    const uploadUrl = await uploadToAssemblyAI(filePath);
    const transcriptId = await startTranscription(uploadUrl);
    const transcript = await pollTranscription(transcriptId);

    const uploadedFile = await gemini.files.upload({
      file: filePath,
      config: {
        mimeType,
      },
    });

    const structuredTranscript = transcript.utterances
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
      
      Transcript:
      ${structuredTranscript}
      
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
    const { fileUri, mimeType, question } = req.body;

    if (!fileUri || !mimeType || !question) {
      return res.status(400).json({
        error: "Missing fileUri, mimeType, or question.",
      });
    }

    const prompt = `You are a helpful assistant. Please answer the user’s question based solely on the audio file.

    If you can identify *exactly when* the answer is mentioned in the audio, include timestamps (e.g. [00:01:23]).
    
    If you are unsure about the exact timing, do not include timestamps at all. Do not guess.
    
    Here is the question: ${question}
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
