// Server-side fixed-model chat endpoint. No user IP is read from headers or stored here.
// Configure GEMINI_API_KEY in the Vercel project's Production environment.
const MODEL = 'gemini-2.5-flash';
const MAX_MESSAGES = 24;
const SYSTEM = `Eres Metatron, un asistente útil en español. Responde en español, naturalmente y con claridad. El compendio de Monster Hunter está disponible en el contexto del usuario; úsalo cuando sea pertinente, pero distingue datos confirmados de orientación y no inventes rangos, resistencias o misiones. La información del juego puede variar por actualización. No pidas datos sensibles. No afirmes que eres una persona.`;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.status(204).end(); return;
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST.' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'El servicio de IA todavía no está configurado. Añade GEMINI_API_KEY en Vercel.' });
  const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-MAX_MESSAGES) : [];
  const knowledge = typeof req.body?.knowledge === 'string' ? req.body.knowledge.slice(0, 18000) : '';
  const contents = messages.filter(m => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content.slice(0, 5000) }] }));
  if (!contents.length || contents.at(-1).role !== 'user') return res.status(400).json({ error: 'Escribe un mensaje para empezar.' });
  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM + (knowledge ? '\n\nCompendio local disponible:\n' + knowledge : '') }] }, contents, generationConfig: { temperature: 0.45, maxOutputTokens: 900 } })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(502).json({ error: data?.error?.message || 'El proveedor de IA no respondió.' });
    const answer = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!answer) return res.status(502).json({ error: 'La IA no devolvió una respuesta.' });
    return res.status(200).json({ answer, model: MODEL });
  } catch (_error) {
    return res.status(502).json({ error: 'No se pudo contactar el servicio de IA.' });
  }
};
