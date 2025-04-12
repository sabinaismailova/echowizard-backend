import axios from "axios";
import fs from "fs";

export const uploadToAssemblyAI = async (filePath) => {
  const res = await axios({
    method: "post",
    url: "https://api.assemblyai.com/v2/upload",
    headers: {
      authorization: process.env.ASSEMBLYAI_API_KEY,
      "transfer-encoding": "chunked",
    },
    data: fs.createReadStream(filePath),
  });

  return res.data.upload_url;
};

export const startTranscription = async (audioUrl) => {
  const res = await axios.post(
    "https://api.assemblyai.com/v2/transcript",
    {
      audio_url: audioUrl,
      speaker_labels: true,
      punctuate: true,
      format_text: true,
    },
    {
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
      },
    }
  );

  return res.data.id;
};

export const pollTranscription = async (transcriptId) => {
  while (true) {
    const res = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      }
    );

    if (res.data.status === "completed") return res.data;
    if (res.data.status === "error") throw new Error("Transcription failed");

    await new Promise((r) => setTimeout(r, 3000));
  }
};

export const getSentences = async (transcriptId) => {
  const res = await axios.get(
    `https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`,
    {
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
      },
    }
  );
  return res.data.sentences;
};

export const formatTime = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return [h, m, s]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

