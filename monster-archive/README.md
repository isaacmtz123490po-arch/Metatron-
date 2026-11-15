# Metatron Hunter Archive

Static Hunter's Archive page intended to deploy from this subfolder. Includes the classic roster from the previous page, a Monster Hunter Wilds roster with post-launch additions, images linked to reference pages, and a browser-only Metatron AI assistant.

## Deploy on Vercel

Set the Vercel project's Root Directory to `monster-archive`; use Framework Preset `Other`, with no build or install command. The page is plain static HTML. Pushing changes to the connected branch should trigger redeployment.

## AI privacy

Lite is a small rule-based local fallback, not a downloaded neural model. Gemini/Groq are optional; users enter their own API key in the browser. The key stays in that browser's local storage and is sent directly to the chosen provider with prompts. Never commit keys. This static site does not contain a server-side secret store or backend proxy.

## Sources and attribution

Monster Hunter and its characters are Capcom properties. Monster guidance and some linked artwork come from the cited community-reference pages; links are shown in each monster card. Wilds update / Gogmazios HR 100 unlock: Capcom official update note at https://info.monsterhunter.com/wilds/update/en-us/Ver.1.040.00.00.html. Roster overview: https://monsterhunterwilds.wiki.fextralife.com/Large_Monsters.
