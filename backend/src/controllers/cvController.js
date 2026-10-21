const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const config = require("../config");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:0.5b";

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "cv-" + unique + ext);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if ([".pdf", ".docx", ".txt"].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .pdf, .docx, .txt files are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

exports.uploadMiddleware = upload.single("file");

// --- regex extraction (deterministic) ---
function extractContact(text) {
  const flat = text.replace(/\s+/g, " ");
  const healed = flat.replace(/([A-Za-z0-9._%+-]+)\s+([A-Za-z0-9._%+-]+@)/g, "$1$2");

  const emailMatch = healed.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  const phoneMatch = text.match(/\+?\d[\d\s-]{8,}\d/);
  const linkedinMatch = healed.match(/linkedin\.com\/in\/[A-Za-z0-9_-]+/);
  const cityMatch = text.match(/(?:Jakarta|Bandung|Surabaya|Yogyakarta|Malang|Bali|Bogor|Depok|Tangerang|Bekasi|Semarang|Medan|Makassar|Palembang|Denpasar)(?:[^\n,]*)/i);

  return {
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0].trim() : "",
    linkedin: linkedinMatch ? linkedinMatch[0] : "",
    city: cityMatch ? cityMatch[0].trim().slice(0, 80) : "",
  };
}

async function callOllama(systemPrompt, userContent, format) {
  const body = {
    model: MODEL,
    stream: false,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    options: { temperature: 0.2, num_ctx: 8192, num_predict: 1500 },
  };
  if (format) body.format = format;
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.message?.content || "";
}

exports.analyzeCv = async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ success: false, message: "No file uploaded." });
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = "";

    if (ext === ".pdf") {
      const data = fs.readFileSync(filePath);
      const parser = new PDFParse({ data });
      const result = await parser.getText();
      text = result.text || "";
      await parser.destroy();
    } else if (ext === ".txt") {
      text = fs.readFileSync(filePath, "utf8");
    } else {
      return res.status(400).json({ success: false, message: "Unsupported file type." });
    }

    if (!text.trim()) {
      return res.status(400).json({ success: false, message: "Could not extract text from file." });
    }

    // 1. Deterministic contact extraction
    const contact = extractContact(text);

    // 2. AI extraction for personal_context + supporting
    const schema = {
      type: "object",
      properties: {
        full_name: { type: "string" },
        salary_expectation: { type: "string" },
        notice_period: { type: "string" },
        languages: { type: "array", items: { type: "string" } },
        skills: { type: "array", items: { type: "string" } },
        personal_context: {
          type: "object",
          properties: {
            about_me: { type: "string" },
            proudest_achievement: { type: "string" },
            career_goal: { type: "string" },
            availability: { type: "string" },
          },
        },
        supporting: {
          type: "object",
          properties: {
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  institution: { type: "string" },
                  degree: { type: "string" },
                  major: { type: "string" },
                  start: { type: "string" },
                  end: { type: "string" },
                  gpa: { type: "string" },
                },
              },
            },
            experiences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company: { type: "string" },
                  title: { type: "string" },
                  start: { type: "string" },
                  end: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        context_draft: { type: "string" },
      },
    };

    const systemPrompt = `Extract structured data from a resume. Copy facts EXACTLY. Fill ALL fields. If not in resume, use "" or []. Write concise first-person summaries. Return valid JSON only.`;

    const userContent = `RESUME:\n${text.slice(0, 6000)}\n\nExtract structured data. JSON only.`;

    let aiResult = {};
    try {
      const raw = await callOllama(systemPrompt, userContent, schema);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("AI analysis failed:", e.message);
    }

    const profile = {
      direct_fill: {
        full_name: aiResult.full_name || "",
        email: contact.email,
        phone: contact.phone,
        city: contact.city,
        linkedin: contact.linkedin,
        salary_expectation: aiResult.salary_expectation || "",
        notice_period: aiResult.notice_period || "",
        languages: aiResult.languages || [],
        skills: aiResult.skills || [],
      },
      personal_context: aiResult.personal_context || {
        about_me: "",
        proudest_achievement: "",
        career_goal: "",
        availability: "",
      },
      supporting: {
        education: aiResult.supporting?.education || [],
        certifications: aiResult.supporting?.certifications || [],
        experiences: aiResult.supporting?.experiences || [],
      },
    };

    const contextDraft = aiResult.context_draft || "";

    return res.json({
      success: true,
      data: {
        profile,
        context_draft: contextDraft,
        raw_text_length: text.length,
      },
      message: "CV analyzed successfully.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to analyze CV: " + err.message });
  } finally {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
  }
};