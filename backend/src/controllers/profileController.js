const fs = require("fs");
const path = require("path");
const config = require("../config");

const PROFILE_PATH = path.resolve(config.profilePath);
const CONTEXT_PATH = path.resolve(config.contextPath);

const EMPTY_PROFILE = {
  direct_fill: {
    full_name: "",
    email: "",
    phone: "",
    city: "",
    linkedin: "",
    salary_expectation: "",
    notice_period: "",
    languages: [],
    skills: [],
  },
  personal_context: {
    about_me: "",
    proudest_achievement: "",
    career_goal: "",
    availability: "",
  },
  supporting: {
    education: [],
    certifications: [],
    experiences: [],
  },
};

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readProfile() {
  ensureDir(PROFILE_PATH);
  if (!fs.existsSync(PROFILE_PATH)) return { ...EMPTY_PROFILE };
  try {
    const raw = fs.readFileSync(PROFILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { ...EMPTY_PROFILE, ...parsed };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

function writeProfile(data) {
  ensureDir(PROFILE_PATH);
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

exports.getProfile = (_req, res) => {
  try {
    const profile = readProfile();
    return res.json({ success: true, data: profile });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = (req, res) => {
  try {
    const body = req.body || {};
    const current = readProfile();
    const merged = {
      direct_fill: { ...current.direct_fill, ...(body.direct_fill || {}) },
      personal_context: { ...current.personal_context, ...(body.personal_context || {}) },
      supporting: { ...current.supporting, ...(body.supporting || {}) },
    };
    writeProfile(merged);
    return res.json({ success: true, data: merged, message: "Profile saved." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getContext = (_req, res) => {
  try {
    ensureDir(CONTEXT_PATH);
    if (!fs.existsSync(CONTEXT_PATH)) {
      return res.json({ success: true, data: { content: "" } });
    }
    const content = fs.readFileSync(CONTEXT_PATH, "utf8");
    return res.json({ success: true, data: { content } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateContext = (req, res) => {
  try {
    const content = typeof req.body?.content === "string" ? req.body.content : "";
    ensureDir(CONTEXT_PATH);
    fs.writeFileSync(CONTEXT_PATH, content, "utf8");
    return res.json({ success: true, data: { content }, message: "Context saved." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};