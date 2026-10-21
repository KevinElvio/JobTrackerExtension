import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

const DIRECT_FIELDS = [
  { key: "full_name", label: "Full Name", type: "text", icon: "👤" },
  { key: "email", label: "Email", type: "email", icon: "✉️" },
  { key: "phone", label: "Phone", type: "text", icon: "📱" },
  { key: "city", label: "City", type: "text", icon: "📍" },
  { key: "linkedin", label: "LinkedIn URL", type: "text", icon: "🔗" },
  { key: "salary_expectation", label: "Salary Expectation", type: "text", icon: "💰" },
  { key: "notice_period", label: "Notice Period", type: "text", icon: "⏱️" },
];

const CONTEXT_FIELDS = [
  { key: "about_me", label: "About Me", rows: 4, placeholder: "Write a short summary about yourself..." },
  { key: "proudest_achievement", label: "Proudest Achievement", rows: 3, placeholder: "Your most notable accomplishment..." },
  { key: "career_goal", label: "Career Goal", rows: 3, placeholder: "Where do you want to be in 3-5 years..." },
  { key: "availability", label: "Availability", rows: 2, placeholder: "When can you start, work preferences..." },
];

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [contextMd, setContextMd] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [languagesText, setLanguagesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [profRes, ctxRes] = await Promise.all([
      api.getProfile(),
      api.getProfileContext(),
    ]);
    if (profRes.success) {
      setProfile(profRes.data);
      const df = profRes.data?.direct_fill || {};
      setSkillsText((df.skills || []).join(", "));
      setLanguagesText((df.languages || []).join(", "));
    }
    if (ctxRes.success) setContextMd(ctxRes.data.content || "");
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateDirect = (key, value) => {
    setProfile((prev) => ({
      ...prev,
      direct_fill: { ...prev.direct_fill, [key]: value },
    }));
  };

  const updateContext = (key, value) => {
    setProfile((prev) => ({
      ...prev,
      personal_context: { ...prev.personal_context, [key]: value },
    }));
  };

  const syncSkillsToProfile = () => {
    const skills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
    setProfile((prev) => ({
      ...prev,
      direct_fill: { ...prev.direct_fill, skills },
    }));
  };

  const syncLanguagesToProfile = () => {
    const languages = languagesText.split(",").map((s) => s.trim()).filter(Boolean);
    setProfile((prev) => ({
      ...prev,
      direct_fill: { ...prev.direct_fill, languages },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const skills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
    const languages = languagesText.split(",").map((s) => s.trim()).filter(Boolean);
    const updatedProfile = {
      ...profile,
      direct_fill: { ...profile.direct_fill, skills, languages },
    };
    setProfile(updatedProfile);
    const [r1, r2] = await Promise.all([
      api.updateProfile(updatedProfile),
      api.updateProfileContext(contextMd),
    ]);
    if (r1.success && r2.success) {
      setMessage("Profile & context saved successfully.");
    } else {
      setError(r1.message || r2.message || "Failed to save.");
    }
    setSaving(false);
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setError("");
    setMessage("");
    const res = await api.analyzeCv(file);
    if (res.success) {
      const data = res.data;
      setProfile(data.profile);
      const df = data.profile?.direct_fill || {};
      setSkillsText((df.skills || []).join(", "));
      setLanguagesText((df.languages || []).join(", "));
      if (data.context_draft) {
        setContextMd(data.context_draft);
      }
      setMessage("CV analyzed. Review the fields below, then save.");
    } else {
      setError(res.message || "Failed to analyze CV.");
    }
    setAnalyzing(false);
    e.target.value = "";
  };

  if (loading) return <div className="profile-loading">Loading profile...</div>;
  if (!profile) return <div className="profile-error">Failed to load profile.</div>;

  const df = profile.direct_fill || {};
  const pc = profile.personal_context || {};

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <div>
          <h1>My Profile</h1>
          <p className="profile-subtitle">
            Upload your CV once. AI extracts your data. Review, edit, and save.
            This profile powers the extension's autofill.
          </p>
        </div>
        <div className="profile-header-actions">
          <label className="btn btn-primary profile-upload-btn">
            {analyzing ? "Analyzing..." : "📄 Upload CV"}
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleCvUpload}
              disabled={analyzing}
              hidden
            />
          </label>
        </div>
      </div>

      {message && <div className="profile-banner profile-banner-success">{message}</div>}
      {error && <div className="profile-banner profile-banner-error">{error}</div>}

      <div className="profile-grid">
        {/* Left column: Direct Fill */}
        <div className="profile-card">
          <div className="profile-card-header">
            <span className="profile-card-icon">⚡</span>
            <div>
              <h3>Direct Fill</h3>
              <p>Deterministic — filled instantly, no AI</p>
            </div>
          </div>
          <div className="profile-card-body">
            {DIRECT_FIELDS.map((f) => (
              <div className="profile-field" key={f.key}>
                <label>
                  <span className="profile-field-icon">{f.icon}</span>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={df[f.key] || ""}
                  onChange={(e) => updateDirect(f.key, e.target.value)}
                  placeholder={f.label}
                />
              </div>
            ))}
            <div className="profile-field">
              <label>
                <span className="profile-field-icon">🛠️</span>
                Skills
              </label>
              <input
                type="text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                onBlur={syncSkillsToProfile}
                placeholder="Node.js, Express, PostgreSQL, ..."
              />
              <span className="profile-field-hint">Comma separated</span>
            </div>
            <div className="profile-field">
              <label>
                <span className="profile-field-icon">🌐</span>
                Languages
              </label>
              <input
                type="text"
                value={languagesText}
                onChange={(e) => setLanguagesText(e.target.value)}
                onBlur={syncLanguagesToProfile}
                placeholder="English, Indonesian, ..."
              />
              <span className="profile-field-hint">Comma separated</span>
            </div>
          </div>
        </div>

        {/* Right column: Personal Context */}
        <div className="profile-card">
          <div className="profile-card-header">
            <span className="profile-card-icon">🧠</span>
            <div>
              <h3>Personal Context</h3>
              <p>AI-assisted — drafts from your CV, edit freely</p>
            </div>
          </div>
          <div className="profile-card-body">
            {CONTEXT_FIELDS.map((f) => (
              <div className="profile-field" key={f.key}>
                <label>{f.label}</label>
                <textarea
                  rows={f.rows}
                  value={pc[f.key] || ""}
                  onChange={(e) => updateContext(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Context Markdown */}
      <div className="profile-card profile-card-full">
        <div className="profile-card-header">
          <span className="profile-card-icon">📝</span>
          <div>
            <h3>Context (Markdown)</h3>
            <p>Full narrative used by AI when filling essay fields. Edit freely.</p>
          </div>
        </div>
        <div className="profile-card-body">
          <textarea
            className="profile-context-editor"
            rows={14}
            value={contextMd}
            onChange={(e) => setContextMd(e.target.value)}
            placeholder="# About Me\n\nWrite your personal narrative here..."
          />
        </div>
      </div>

      <div className="profile-save-bar">
        <button className="btn btn-primary profile-save-btn" onClick={handleSaveAll} disabled={saving}>
          {saving ? "Saving..." : "💾 Save All"}
        </button>
      </div>
    </div>
  );
}