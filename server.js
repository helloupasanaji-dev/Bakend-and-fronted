const express = require('express');
const path = require('node:path');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const recentRequests = new Map();
const demoPayments = [];

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (_req, res) => {
  res.json({ aiAvailable: Boolean(openai), paymentsMode: 'demo' });
});

app.post('/api/payments/demo', (req, res) => {
  const method = req.body?.method;
  if (!['card', 'upi'].includes(method)) {
    return res.status(400).json({ error: 'Choose card or UPI for the demo.' });
  }
  const payment = {
    id: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    amount: 249900,
    currency: 'INR',
    method,
    status: 'demo_completed',
    createdAt: new Date().toISOString(),
  };
  demoPayments.unshift(payment);
  if (demoPayments.length > 50) demoPayments.pop();
  res.status(201).json({ payment });
});

app.get('/api/payments/demo', (_req, res) => {
  res.json({ payments: demoPayments });
});

app.post('/api/assistant', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  if (now - (recentRequests.get(ip) || 0) < 1200) {
    return res.status(429).json({ error: 'Please wait a moment before sending another message.' });
  }
  recentRequests.set(ip, now);

  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 10) {
    return res.status(400).json({ error: 'Send up to 10 recent chat messages.' });
  }
  const input = messages.slice(-8).map(message => ({
    role: message?.role === 'assistant' ? 'assistant' : 'user',
    content: String(message?.content || '').trim().slice(0, 1000),
  })).filter(message => message.content);
  if (!input.length || input[input.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Add a message to continue.' });
  }
  const containsSensitiveData = text => /(?:\d[ -]?){13,19}/.test(text) || /[\w.+-]{2,}@[\w.-]{2,}\.[a-z]{2,}/i.test(text) || /\b(?:otp|cvv|cvc|password|passcode)\s*[:=]?\s*\S+/i.test(text);
  if (input.some(message => message.role === 'user' && containsSensitiveData(message.content))) {
    return res.json({ reply: 'For your safety, I did not send that message to the assistant. Please do not share card numbers, UPI IDs, CVV, passwords, or OTPs here.', mode: 'safety' });
  }

  if (!openai) {
    return res.json({
      reply: 'I’m in preview mode right now. Add OPENAI_API_KEY to your .env file and restart the server to enable AI replies. For this demo, card and UPI checkouts do not process real payments.',
      mode: 'preview',
    });
  }

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.5',
      instructions: 'You are Fieldnotes Pay’s concise checkout support assistant. Help with payment methods, checkout steps, and general payment concepts. This app is currently a demo: never claim a payment was processed, never request card numbers, CVV, passwords, OTPs, or full UPI credentials, and do not give regulated financial advice. If asked about a transaction, explain that this demo does not process real payments. Keep replies friendly and under 100 words.',
      input,
      max_output_tokens: 220,
    });
    res.json({ reply: response.output_text || 'I could not draft a reply just now. Please try again.', mode: 'ai' });
  } catch (error) {
    console.error('AI assistant request failed:', error.message);
    res.status(502).json({ error: 'The AI assistant is unavailable for a moment. Please try again.' });
  }
});

app.listen(PORT, () => console.log(`Fieldnotes Pay is running at http://localhost:${PORT}`));
