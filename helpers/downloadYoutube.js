import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const downloadYoutubeAsMp3 = (youtubeUrl) => {
  return new Promise((resolve, reject) => {
    const outputFilename = `${uuidv4()}.mp3`;
    const outputPath = path.join(__dirname, "..", "uploads", outputFilename);

    const command = `yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o "${outputPath}" "${youtubeUrl}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("yt-dlp error:", stderr);
        reject(error);
      } else {
        resolve(outputPath);
      }
    });
  });
};
