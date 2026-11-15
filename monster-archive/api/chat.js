// Metatron server chat: fixed model per provider, automatic failover, no client IP collection.
const MAX_MESSAGES = 24;
const MAX_KNOWLEDGE = 18000;
const SYSTEM = `Eres Metatron, un asistente inteligente y útil en español. Responde con claridad y calidez. El usuario puede incluir un compendio local; úsalo como referencia, señala incertidumbre y no inventes datos. Monster Hunter y otros datos del juego pueden variar por versión. No pidas ni repitas contraseñas, claves API u otros datos sensibles. No afirmes ser una persona.`;
const PROVIDERS = [
  { name: 'Gemini', key: 'GEMINI_API_KEY', model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', kind: 'gemini', url: 'https://generativelanguage.googleapis.com/v1beta/models/' },
  { name: 'OpenAI', key: 'OPENAI_API_KEY', model: process.env.OPENAI_MODEL || 'gpt-4o-mini', kind: 'openai', url: 'https://api.openai.com/v1/chat/completions' },
  { name: 'Groq', key: 'GROQ_API_KEY', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', kind: 'openai', url: 'https://api.groq.com/openai/v1/chat/completions' },
  { name: 'OpenRouter', key: 'OPENROUTER_API_KEY', model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini', kind: 'openai', url: 'https://openrouter.ai/api/v1/chat/completions' },
  { name: 'DeepSeek', key: 'DEEPSEEK_API_KEY', model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', kind: 'openai', url: 'https://api.deepseek.com/chat/completions' },
  { name: 'Mistral', key: 'MISTRAL_API_KEY', model: process.env.MISTRAL_MODEL || 'mistral-small-latest', kind: 'openai', url: 'https://api.mistral.ai/v1/chat/completions' },
  { name: 'Cerebras', key: 'CEREBRAS_API_KEY', model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b', kind: 'openai', url: 'https://api.cerebras.ai/v1/chat/completions' }
];
const configured = () => PROVIDERS.filter(p => Boolean(process.env[p.key]));

async function askProvider(provider, messages, knowledge) {
  const instruction = SYSTEM + (knowledge ? '\n\nCompendio local de referencia:\n' + knowledge : '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const url = provider.kind === 'gemini'
      ? `${provider.url}${encodeURIComponent(provider.model)}:generateContent`
      : provider.url;
    const headers = { 'Content-Type': 'application/json' };
    let body;
    if (provider.kind === 'gemini') {
      headers['x-goog-api-key'] = process.env[provider.key];
      body = { systemInstruction: { parts: [{ text: instruction }] }, contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { temperature: 0.45, maxOutputTokens: 1000 } };
    } else {
      headers.Authorization = `Bearer ${process.env[provider.key]}`;
      if (provider.name === 'OpenRouter') headers['HTTP-Referer'] = 'https://metatronaip.vercel.app';
      body = { model: provider.model, messages: [{ role: 'system', content: instruction }, ...messages], temperature: 0.45, max_tokens: 1000 };
    }
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const answer = provider.kind === 'gemini'
      ? data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim()
      : data?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error('Respuesta vacía');
    return answer;
  } finally { clearTimeout(timeout); }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const origin = req.headers.origin || '';
  const allowedOrigin = process.env.APP_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : (origin === allowedOrigin ? allowedOrigin : 'null'));
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ service: 'Metatron AI', status: 'online', configuredProviders: configured().map(p => p.name), note: 'The model is selected automatically; provider keys are never returned.' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST.' });
  const providers = configured();
  if (!providers.length) return res.status(503).json({ error: 'El chat está publicado, pero aún falta configurar al menos una clave de proveedor como variable de entorno en Vercel.', code: 'NO_PROVIDER_CONFIGURED' });
  const raw = Array.isArray(req.body?.messages) ? req.body.messages.slice(-MAX_MESSAGES) : [];
  const messages = raw.filter(m => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 5000) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages.at(-1).role !== 'user') return res.status(400).json({ error: 'Escribe un mensaje para empezar.' });
  const knowledge = typeof req.body?.knowledge === 'string' ? req.body.knowledge.slice(0, MAX_KNOWLEDGE) : '';
  const failures = [];
  const startedAt = Date.now();
  for (const provider of providers) {
    if (Date.now() - startedAt > 50000) break;
    try {
      const answer = await askProvider(provider, messages, knowledge);
      return res.status(200).json({ answer, provider: provider.name, model: provider.model, fallback: failures.length > 0 });
    } catch (error) {
      // Never return credentials or provider error bodies to the client. Try the next configured service.
      failures.push(provider.name);
    }
  }
  return res.status(502).json({ error: 'Los proveedores configurados no pudieron responder. Puedes volver a intentar; el chat no se corta y probará las alternativas disponibles.', code: 'ALL_PROVIDERS_FAILED', tried: failures });
};
module.exports.config = { maxDuration: 60 };
