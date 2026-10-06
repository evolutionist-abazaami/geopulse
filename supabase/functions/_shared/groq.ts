// Groq (OpenAI-compatible) primary provider. Accepts a Gemini-style request body
// and returns a Gemini-shaped Response so existing parsing code keeps working.
// Returns null when Groq is unavailable/unsuitable so callers fall back to Gemini.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";
export const GROQ_VISION_MODEL = "qwen/qwen3.8-27b";

function convertParts(parts: any[]): { content: any; hasImage: boolean; unsupported: boolean } {
  let hasImage = false;
  let unsupported = false;
  const out: any[] = [];
  for (const p of parts || []) {
    if (typeof p?.text === "string") out.push({ type: "text", text: p.text });
    else if (p?.inlineData) {
      const mime = p.inlineData.mimeType || "";
      if (mime.startsWith("image/")) {
        hasImage = true;
        out.push({ type: "image_url", image_url: { url: `data:${mime};base64,${p.inlineData.data}` } });
      } else unsupported = true;
    }
  }
  if (!hasImage) return { content: out.map((o) => o.text).join("\n"), hasImage, unsupported };
  return { content: out, hasImage, unsupported };
}

export function geminiBodyToOpenAI(body: any, stream = false) {
  const wantsJson = body?.generationConfig?.responseMimeType === "application/json";
  let system = (body?.systemInstruction?.parts || []).map((p: any) => p.text).join("\n");
  if (wantsJson) system += "\n\nRespond ONLY with a single valid JSON object.";
  const messages: any[] = system ? [{ role: "system", content: system }] : [];
  let anyImage = false;
  let anyUnsupported = false;
  for (const c of body?.contents || []) {
    const { content, hasImage, unsupported } = convertParts(c.parts);
    anyImage ||= hasImage;
    anyUnsupported ||= unsupported;
    messages.push({ role: c.role === "model" ? "assistant" : "user", content });
  }
  const req: any = {
    model: anyImage ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
    messages,
    stream,
  };
  const gc = body?.generationConfig || {};
  if (typeof gc.temperature === "number") req.temperature = gc.temperature;
  if (typeof gc.maxOutputTokens === "number") req.max_tokens = Math.min(gc.maxOutputTokens, 8000);
  if (wantsJson) req.response_format = { type: "json_object" };
  return { req, unsupported: anyUnsupported };
}

/** Try Groq; on success return a Gemini-shaped JSON Response, else null. */
export async function tryGroq(geminiBody: string | object): Promise<Response | null> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) return null;
  try {
    const body = typeof geminiBody === "string" ? JSON.parse(geminiBody) : geminiBody;
    const { req, unsupported } = geminiBodyToOpenAI(body);
    if (unsupported) return null; // e.g. PDFs — let Gemini handle
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content || "";
        console.log(`AI success on Groq ${req.model}`);
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      const t = await res.text();
      console.error(`Groq error (attempt ${attempt}):`, res.status, t.slice(0, 300));
      if (res.status !== 429 && res.status < 500) return null;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 + Math.random() * 500));
    }
  } catch (e) {
    console.error("Groq call failed:", e);
  }
  return null;
}

/** Streaming chat via Groq; returns the raw OpenAI-style SSE Response or null. */
export async function tryGroqStream(geminiBody: object): Promise<Response | null> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) return null;
  try {
    const { req } = geminiBodyToOpenAI(geminiBody, true);
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (res.ok && res.body) return res;
    console.error("Groq stream error:", res.status, (await res.text()).slice(0, 300));
  } catch (e) {
    console.error("Groq stream failed:", e);
  }
  return null;
}
