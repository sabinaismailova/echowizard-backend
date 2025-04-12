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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const upload = multer({ dest: "uploads/" });

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json());

async function generateFromGemini(prompt, model = "gemini-2.0-flash") {
  const response = await gemini.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text;
}

//POST - generate and return the summary of the contents of audio file
app.post("/summarize-upload", upload.single("audio"), async (req, res) => {
  try {
    const filePath = path.join(__dirname, req.file.path);
    const mimeType = "audio/mpeg";

    const uploadedFile = await gemini.files.upload({
      file: filePath,
      config: { mimeType },
    });

    const response = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
        createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
        `You are a helpful assistant. Please summarize the contents of the audio file with the following structure : 
        
        Summary with sections: 
        🧠 Key Takeaways 
        ✅ Action Items 
        🤖 Suggested Follow-up Questions
        
        `,
      ]),
    });

    fs.unlinkSync(filePath);

    res.json({ 
      summary: response.text, 
    });
  } catch (err) {
    console.error("Error processing audio:", err);
    res.status(500).json({ error: "Failed to process audio", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
