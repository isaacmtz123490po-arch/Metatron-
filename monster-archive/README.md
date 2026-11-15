# Metatron AI

Single-screen, responsive chat app. The Monster Hunter classic and Wilds compendium remains in the app as local assistant knowledge, but is not shown as a separate section.

## Deploy on Vercel

- Project root directory: `monster-archive`
- Production API URL: `https://metatronaip.vercel.app/api/chat`
- Add `GEMINI_API_KEY` as a **Production** environment variable in Vercel, then redeploy. This key is server-side only and must never be added to the HTML or the client app.
- Fixed model: `gemini-2.5-flash`; the app does not ask the user to choose a model.

## API

`POST /api/chat` with JSON:

```json
{
  "messages": [
    {"role": "user", "content": "Hola"}
  ],
  "knowledge": "Optional app-local context"
}
```

Successful response: `{"answer":"...","model":"gemini-2.5-flash"}`. The endpoint reads no client IP header and does not store chats. The chat transcript and notes stay in the browser's local storage. Hosting providers may retain routine infrastructure/security logs according to their policies.

For a separate app hosted on a different origin, configure a specific allowed origin before enabling browser CORS; do not expose the provider key in the app.
