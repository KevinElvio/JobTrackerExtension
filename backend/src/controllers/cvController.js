const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");

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
    city: cityMatch ? cityMatch[0].trim() : "",
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
    options: { temperature: 0.2, num_ctx: 8192, num_predict: 1000 },
  };
  if (format) body.format = format;
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Ollama error: " + res.status);
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
    const cvText = text.slice(0, 4000);

    // 2. Pass 1: structured data
    const schema1 = {
      type: "object",
      properties: {
        full_name: { type: "string" },
        salary_expectation: { type: "string" },
        notice_period: { type: "string" },
        languages: { type: "array", items: { type: "string" } },
        skills: { type: "array", items: { type: "string" } },
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
    };

    let aiResult = {
      full_name: "",
      salary_expectation: "",
      notice_period: "",
      languages: [],
      skills: [],
      supporting: { education: [], certifications: [], experiences: [] },
      personal_context: { about_me: "", proudest_achievement: "", career_goal: "", availability: "" },
      context_draft: "",
    };

    try {
      const raw1 = await callOllama(
        "Extract structured data from a resume. Copy facts EXACTLY. Fill ALL fields. If not in resume, use empty string or empty array. Return valid JSON only.",
        `RESUME:\n${cvText}\n\nExtract: full_name, salary_expectation, notice_period, languages (spoken languages like English, Indonesian - NOT programming languages), skills (programming/technical skills), education (institution, degree, major, start, end, gpa), experiences (company, title, start, end, description). JSON only.`,
        schema1
      );
      const jsonMatch1 = raw1.match(/\{[\s\S]*\}/);
      if (jsonMatch1) {
        const parsed1 = JSON.parse(jsonMatch1[0]);
        aiResult.full_name = parsed1.full_name || "";
        aiResult.salary_expectation = parsed1.salary_expectation || "";
        aiResult.notice_period = parsed1.notice_period || "";
        aiResult.languages = parsed1.languages || [];
        aiResult.skills = parsed1.skills || [];
        aiResult.supporting.education = parsed1.education || [];
        aiResult.supporting.experiences = parsed1.experiences || [];
      }
    } catch (e) {
      console.error("AI pass 1 failed:", e.message);
    }

    // 3. Pass 2: personal context + narrative
    const schema2 = {
      type: "object",
      properties: {
        about_me: { type: "string" },
        proudest_achievement: { type: "string" },
        career_goal: { type: "string" },
        availability: { type: "string" },
        context_draft: { type: "string" },
      },
    };

    try {
      const raw2 = await callOllama(
        "Write concise first-person summaries based ONLY on the resume. Return valid JSON only.",
        `RESUME:\n${cvText}\n\nWrite: about_me (2-3 sentences who you are), proudest_achievement (1 sentence), career_goal (1 sentence), availability (when can start), context_draft (markdown with ## About Me, ## Proudest Achievement, ## Career Goal sections). JSON only.`,
        schema2
      );
      const jsonMatch2 = raw2.match(/\{[\s\S]*\}/);
      if (jsonMatch2) {
        const parsed2 = JSON.parse(jsonMatch2[0]);
        aiResult.personal_context.about_me = parsed2.about_me || "";
        aiResult.personal_context.proudest_achievement = parsed2.proudest_achievement || "";
        aiResult.personal_context.career_goal = parsed2.career_goal || "";
        aiResult.personal_context.availability = parsed2.availability || "";
        aiResult.context_draft = parsed2.context_draft || "";
      }

      // Fallback: generate context_draft from personal_context if empty
      if (!aiResult.context_draft) {
        const pc = aiResult.personal_context;
        aiResult.context_draft = "## About Me\n" + (pc.about_me || "") + "\n\n## Proudest Achievement\n" + (pc.proudest_achievement || "") + "\n\n## Career Goal\n" + (pc.career_goal || "");
      }
    } catch (e) {
      console.error("AI pass 2 failed:", e.message);
    }

    const profile = {
      direct_fill: {
        full_name: aiResult.full_name,
        email: contact.email,
        phone: contact.phone,
        city: contact.city,
        linkedin: contact.linkedin,
        salary_expectation: aiResult.salary_expectation,
        notice_period: aiResult.notice_period,
        languages: aiResult.languages,
        skills: aiResult.skills,
      },
      personal_context: aiResult.personal_context,
      supporting: aiResult.supporting,
    };

    return res.json({
      success: true,
      data: {
        profile,
        context_draft: aiResult.context_draft,
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