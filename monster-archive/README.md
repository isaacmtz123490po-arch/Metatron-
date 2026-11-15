# Metatron AI

Single-screen, responsive AI chat. The full classic + Monster Hunter Wilds compendium remains hidden from the interface and is attached to the assistant as knowledge. Chat sends no browser IP field, API key, or provider selection. The deployment platform may still keep its normal infrastructure logs.

## API

Production endpoint: `https://metatronaip.vercel.app/api/chat`

- `GET /api/chat` reports health and which provider integrations have server keys configured.
- `POST /api/chat` accepts JSON `{ "messages": [{ "role": "user", "content": "Hola" }], "knowledge": "optional app context" }`.
- Response: `{ "answer": "...", "provider": "Gemini", "model": "gemini-2.5-flash", "fallback": false }`.
- CORS is enabled for connecting a separate app; provider credentials stay on Vercel, never in client HTML or the app.
- The handler doesn't read/store visitor IP headers or store chats. The browser keeps chat history locally.

## Automatic provider failover

The server tries configured providers in this order and automatically continues to the next when one errors, times out or rejects a request (including quota exhaustion): Gemini, OpenAI, Groq, OpenRouter, DeepSeek, Mistral, Cerebras. No user-facing model picker. Unconfigured providers are skipped. Each successful response identifies the provider used, not a required setting.

In Vercel Project → Settings → Environment Variables, add one or more provider keys for Production, then redeploy:

- `GEMINI_API_KEY` (optional model override `GEMINI_MODEL`; default `gemini-2.5-flash`)
- `OPENAI_API_KEY` (`OPENAI_MODEL`; default `gpt-4o-mini`)
- `GROQ_API_KEY` (`GROQ_MODEL`; default `llama-3.3-70b-versatile`)
- `OPENROUTER_API_KEY` (`OPENROUTER_MODEL`; default `openai/gpt-4o-mini`)
- `DEEPSEEK_API_KEY` (`DEEPSEEK_MODEL`; default `deepseek-chat`)
- `MISTRAL_API_KEY` (`MISTRAL_MODEL`; default `mistral-small-latest`)
- `CEREBRAS_API_KEY` (`CEREBRAS_MODEL`; default `llama-3.3-70b`)

Never commit keys to GitHub. Each provider bills/limits its own API key; failover does not transfer or combine quotas. For initial test, configure two providers. A GIF will be placed in the thinking/loading animation when supplied by the user.
