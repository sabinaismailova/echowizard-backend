export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    `${process.env.FRONTEND_URL}`
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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
}
