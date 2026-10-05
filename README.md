# Livestock Health AI

Describe symptoms and upload photos of an animal. The backend sends them to Claude (vision) and returns a structured assessment: urgency, likely conditions, immediate actions, and questions for the vet.

## Run it

```bash
# 1. Backend (port 8787)
cd server
npm install
cp .env.example .env      # paste your ANTHROPIC_API_KEY
npm start

# 2. Frontend (port 5173) in a second terminal
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Why it is fast
- Photos are resized to 1024px JPEG in the browser before upload (small payloads).
- The API key never touches the browser; React calls `/api/analyze`, the server calls Claude.
- Output is a compact JSON schema with a capped `max_tokens`.
- Rate limiting protects your API spend.

## Deploy
Set `VITE_API_URL` in the client to your backend URL, and `CLIENT_ORIGIN` in the server `.env` to your frontend URL.
