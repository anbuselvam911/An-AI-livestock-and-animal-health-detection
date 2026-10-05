import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const PORT = process.env.PORT || 8787;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "12mb" }));
app.use("/api/", rateLimit({ windowMs: 60_000, max: 20 }));

const SYSTEM_PROMPT = `You are a livestock health triage assistant supporting farmers.
Given the species, age, symptoms, duration and optional photos, assess the animal.

Respond with ONLY a JSON object, no markdown, in this exact shape:
{
  "urgency": "emergency" | "urgent" | "monitor" | "routine",
  "summary": "one or two plain-language sentences",
  "conditions": [
    { "name": "string", "likelihood": "high" | "medium" | "low", "why": "short reason tied to the signs given" }
  ],
  "visible_signs": ["what you can actually see in the photos, empty array if no photos"],
  "immediate_actions": ["short, practical steps the farmer can take now"],
  "isolate": true | false,
  "possibly_notifiable": true | false,
  "vet_questions": ["questions or details a vet will ask"]
}

Rules:
- Give at most 4 conditions, most likely first.
- Use simple language. Farmers may read this on a phone in the field.
- Mark "emergency" for signs like bloat, difficulty breathing, severe bleeding, inability to stand, seizures, prolonged labor, or sudden deaths in the herd.
- Set possibly_notifiable true when signs could match a reportable disease (for example foot-and-mouth disease, anthrax, brucellosis, avian influenza, African swine fever) and advise contacting the local veterinary authority.
- Never give drug doses. Recommend a vet for treatment.
- If the information is too thin, say so in the summary and list what to check next.`;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model reply");
  return JSON.parse(text.slice(start, end + 1));
}

app.post("/api/analyze", async (req, res) => {
  try {
    const { species, age, symptoms, duration, images = [] } = req.body || {};

    if (typeof species !== "string" || typeof symptoms !== "string" || symptoms.trim().length < 5) {
      return res.status(400).json({ error: "Please provide the species and describe the symptoms." });
    }
    if (!Array.isArray(images) || images.length > 3) {
      return res.status(400).json({ error: "You can attach up to 3 photos." });
    }
    for (const img of images) {
      if (!ALLOWED_TYPES.has(img.media_type) || typeof img.data !== "string" || img.data.length > 5_000_000) {
        return res.status(400).json({ error: "Photos must be JPEG, PNG or WebP and under 5 MB." });
      }
    }

    const details = [
      `Species: ${species}`,
      age ? `Age: ${age}` : null,
      duration ? `Symptoms started: ${duration}` : null,
      `Symptoms: ${symptoms.trim()}`,
    ].filter(Boolean).join("\n");

    const content = [
      ...images.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: img.media_type, data: img.data },
      })),
      { type: "text", text: details },
    ];

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    res.json(extractJson(text));
  } catch (err) {
    console.error(err);
    const status = err?.status === 429 ? 429 : 500;
    res.status(status).json({
      error: status === 429 ? "Too many requests. Try again in a minute." : "Analysis failed. Please try again.",
    });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
