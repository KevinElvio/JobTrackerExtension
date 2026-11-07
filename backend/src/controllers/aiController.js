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
    const { text, jsonLd, url } = req.body || {};
    const rawText = String(text || "").trim();
    if (!rawText) {
      return res.status(400).json({ success: false, message: "text is required." });
    }

    const truncated = rawText.slice(0, 6000);
    const jsonLdStr = jsonLd ? JSON.stringify(jsonLd).slice(0, 4000) : "";

    const systemPrompt =
      "You extract job posting fields from the provided page text. " +
      "Return ONLY a valid JSON object with exactly these keys: " +
      "job_role, company_name, location, salary_range, employment_type, job_description, application_platform. " +
      "Use null for any field not present in the text. Never invent facts. " +
      "Prefer structured JSON-LD data if provided. Focus on the PRIMARY job matching the URL. " +
      "Ignore lists of other jobs or recommendations. " +
      "job_description must be a concise excerpt (max 500 chars) from the text, not a rewrite. " +
      "No markdown, no preamble, JSON only.";

    const userContent =
      `URL: ${String(url || "")}\n\n` +
      (jsonLdStr ? `JSON-LD:\n${jsonLdStr}\n\n` : "") +
      `PAGE TEXT:\n${truncated}`;

    async function callModel(extraUser = "") {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            stream: false,
            format: "json",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent + (extraUser ? "\n\n" + extraUser : "") },
            ],
            options: { temperature: 0, num_predict: 400, num_ctx: 4096 },
          }),
          signal: controller.signal,
        });
        if (!ollamaRes.ok) {
          throw new Error("Ollama error: " + ollamaRes.status);
        }
        const data = await ollamaRes.json();
        let content = data.message?.content?.trim() || "";
        content = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        return JSON.parse(content);
      } finally {
        clearTimeout(timeout);
      }
    }

    let parsed;
    try {
      parsed = await callModel();
    } catch (e) {
      return res.status(502).json({ success: false, message: e.message });
    }

    let extracted = sanitizeExtracted(parsed);

    // Multi-pass: retry once for critical null fields with focused prompt.
    if (!extracted.job_role || !extracted.company_name) {
      try {
        const retryParsed = await callModel(
          "The previous extraction missed job_role or company_name. Re-extract carefully from the text above. Return the same JSON keys."
        );
        const retryExtracted = sanitizeExtracted(retryParsed);
        // Only fill fields that were null
        for (const key of EXTRACT_KEYS) {
          if (extracted[key] == null && retryExtracted[key] != null) {
            extracted[key] = retryExtracted[key];
          }
        }
      } catch (e) {
        // ignore retry failure
      }
    }

    return res.json({ success: true, data: extracted });
  } catch (err) {
    const msg = err.name === "AbortError" ? "Extraction timed out." : err.message;
    return res.status(500).json({ success: false, message: msg });
  }
};