const config = require("../config");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:3b";

exports.generate = async (req, res) => {
  try {
    const { question, job_context, personal_context } = req.body || {};
    if (!question) {
      return res.status(400).json({ success: false, message: "question is required." });
    }

    const jobStr = typeof job_context === "object"
      ? JSON.stringify(job_context, null, 2)
      : String(job_context || "");
    const personalStr = String(personal_context || "");

    const systemPrompt =
      "You write ONE short paragraph (max 3 sentences) answering a job application question. " +
      "Use ONLY facts from PERSONAL CONTEXT. Never invent facts. " +
      "If the question asks about the company/role, incorporate details from JOB CONTEXT. " +
      "Plain text only, no bullet points, no preamble.";

    const userContent = `PERSONAL CONTEXT:\n${personalStr}\n\nJOB CONTEXT:\n${jobStr}\n\nQUESTION: ${question}`;

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        options: { temperature: 0.3, num_predict: 220, num_ctx: 8192 },
      }),
    });

    if (!ollamaRes.ok) {
      return res.status(502).json({ success: false, message: "Ollama error: " + ollamaRes.status });
    }

    const data = await ollamaRes.json();
    const answer = data.message?.content?.trim() || "";

    return res.json({ success: true, data: { answer } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// --- AI extraction of job posting fields from page text ---
const EXTRACT_KEYS = [
  "job_role",
  "company_name",
  "location",
  "salary_range",
  "employment_type",
  "job_description",
  "application_platform",
];

function sanitizeExtracted(obj) {
  const out = {};
  for (const key of EXTRACT_KEYS) {
    let val = obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null;
    if (val === undefined) val = null;
    if (typeof val === "string") {
      val = val.trim();
      if (key === "job_description" && val.length > 500) val = val.slice(0, 500);
      if (val === "") val = null;
    } else if (val !== null && typeof val !== "string") {
      val = String(val).trim() || null;
    }
    out[key] = val;
  }
  return out;
}

exports.extract = async (req, res) => {
  try {
    const { text, url } = req.body || {};
    const rawText = String(text || "").trim();
    if (!rawText) {
      return res.status(400).json({ success: false, message: "text is required." });
    }

    // Prioritise top of page; cap to avoid token overflow.
    const truncated = rawText.slice(0, 6000);

    const systemPrompt =
      "You extract job posting fields from the provided page text. " +
      "Return ONLY a valid JSON object with exactly these keys: " +
      "job_role, company_name, location, salary_range, employment_type, job_description, application_platform. " +
      "Use null for any field not present in the text. Never invent facts. " +
      "job_description must be a concise excerpt (max 500 chars) from the text, not a rewrite. " +
      "No markdown, no preamble, JSON only.";

    const userContent = `URL: ${String(url || "")}\n\nPAGE TEXT:\n${truncated}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let ollamaRes;
    try {
      ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          stream: false,
          format: "json",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          options: { temperature: 0, num_predict: 400, num_ctx: 4096 },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!ollamaRes.ok) {
      return res.status(502).json({ success: false, message: "Ollama error: " + ollamaRes.status });
    }

    const data = await ollamaRes.json();
    let content = data.message?.content?.trim() || "";

    // Strip possible code fences just in case.
    content = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Retry once with stricter reminder is not possible here; return failure.
      return res.status(502).json({ success: false, message: "Invalid JSON from model: " + e.message });
    }

    const extracted = sanitizeExtracted(parsed);
    return res.json({ success: true, data: extracted });
  } catch (err) {
    const msg = err.name === "AbortError" ? "Extraction timed out." : err.message;
    return res.status(500).json({ success: false, message: msg });
  }
};