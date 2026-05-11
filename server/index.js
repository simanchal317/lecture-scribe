const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const Groq = require('groq-sdk');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 200 * 1024 * 1024 }
});

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const prompt = messages[0].content;
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });
    res.json({ content: [{ text: chatCompletion.choices[0]?.message?.content }] });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: { message: "No video file." } });

  const videoPath = req.file.path;
  const audioPath = videoPath + '.mp3';
  const { prompt: customPrompt } = req.body;

  ffmpeg(videoPath)
    .toFormat('mp3')
    .on('end', async () => {
      try {
        const ffmpegPath = require('ffmpeg-static');
        exec(`python transcriber.py "${audioPath}"`, { env: { ...process.env, FFMPEG_PATH: ffmpegPath } }, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: { message: error.message } });
          }
          const transcriptionText = stdout;

          groq.chat.completions.create({
            messages: [{ role: "user", content: `Analyze this transcript: ${transcriptionText}. ${customPrompt}` }],
            model: "llama-3.3-70b-versatile",
          }).then(chatCompletion => {
            fs.unlinkSync(videoPath);
            fs.unlinkSync(audioPath);
            res.json({ content: [{ text: chatCompletion.choices[0]?.message?.content }] });
          }).catch(err => {
            res.status(500).json({ error: { message: err.message } });
          });
        });
      } catch (error) {
        res.status(500).json({ error: { message: error.message } });
      }
    })
    .on('error', (err) => res.status(500).json({ error: { message: err.message } }))
    .save(audioPath);
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
