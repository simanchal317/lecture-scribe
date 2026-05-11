const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;
    const prompt = messages[0].content;
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });
    res.status(200).json({ content: [{ text: chatCompletion.choices[0]?.message?.content }] });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
};
