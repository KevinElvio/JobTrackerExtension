import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

const DIRECT_FIELDS = [
  { key: "full_name", label: "Full Name", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "linkedin", label: "LinkedIn URL", type: "text" },
  { key: "salary_expectation", label: "Salary Expectation", type: "text" },
  { key: "notice_period", label: "Notice Period", type: "text" },
];

const CONTEXT_FIELDS = [
  { key: "about_me", label: "About Me", rows: 3 },
  { key: "proudest_achievement", label: "Proudest Achievement", rows: 2 },
  { key: "career_goal", label: "Career Goal", rows: 2 },
  { key: "availability", label: "Availability", rows: 2 },
];

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [contextMd, setContextMd] = useState("");
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
    if (profRes.success) setProfile(profRes.data);
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

  const updateSkills = (value) => {
    const skills = value.split(",").map((s) => s.trim()).filter(Boolean);
    setProfile((prev) => ({
      ...prev,
      direct_fill: { ...prev.direct_fill, skills },
    }));
  };

  const updateLanguages = (value) => {
    const languages = value.split(",").map((s) => s.trim()).filter(Boolean);
    setProfile((prev) => ({
      ...prev,
      direct_fill: { ...prev.direct_fill, languages },
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await api.updateProfile(profile);
    if (res.success) {
      setMessage("Profile saved.");
    } else {
      setError(res.message || "Failed to save profile.");
    }
    setSaving(false);
  };

  const handleSaveContext = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await api.updateProfileContext(contextMd);
    if (res.success) {
      setMessage("Context saved.");
    } else {
      setError(res.message || "Failed to save context.");
    }
    setSaving(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const [r1, r2] = await Promise.all([
      api.updateProfile(profile),
      api.updateProfileContext(contextMd),
    ]);
    if (r1.success && r2.success) {
      setMessage("Profile & context saved.");
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

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!profile) return <div className="error">Failed to load profile.</div>;

  const df = profile.direct_fill || {};
  const pc = profile.personal_context || {};

  return (
    <div className="profile-page">
      <h2>Profile</h2>
      <p className="profile-hint">
        Upload your CV once. AI extracts your data. Review and edit, then save.
        This profile is used by the extension to autofill job application forms.
      </p>

      <div className="profile-section">
        <h3>Upload CV</h3>
        <input
          type="file"
          accept=".pdf,.txt"
          onChange={handleCvUpload}
          disabled={analyzing}
        />
        {analyzing && <span className="profile-status">Analyzing CV with AI...</span>}
      </div>

      <div className="profile-section">
        <h3>Direct Fill (deterministic)</h3>
        <p className="profile-hint">These fields are filled instantly without AI.</p>
        {DIRECT_FIELDS.map((f) => (
          <div className="form-group" key={f.key}>
            <label>{f.label}</label>
            <input
              type={f.type}
              value={df[f.key] || ""}
              onChange={(e) => updateDirect(f.key, e.target.value)}
            />
          </div>
        ))}
        <div className="form-group">
          <label>Skills (comma separated)</label>
          <input
            type="text"
            value={(df.skills || []).join(", ")}
            onChange={(e) => updateSkills(e.target.value)}
            placeholder="Node.js, Express, PostgreSQL, ..."
          />
        </div>
        <div className="form-group">
          <label>Languages (comma separated)</label>
          <input
            type="text"
            value={(df.languages || []).join(", ")}
            onChange={(e) => updateLanguages(e.target.value)}
            placeholder="English, Indonesian, ..."
          />
        </div>
      </div>

      <div className="profile-section">
        <h3>Personal Context (AI-assisted)</h3>
        <p className="profile-hint">AI drafts these from your CV. Edit as needed.</p>
        {CONTEXT_FIELDS.map((f) => (
          <div className="form-group" key={f.key}>
            <label>{f.label}</label>
            <textarea
              rows={f.rows}
              value={pc[f.key] || ""}
              onChange={(e) => updateContext(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="profile-section">
        <h3>Context (Markdown)</h3>
        <p className="profile-hint">
          This is the full narrative context used by AI when filling essay fields.
          Edit freely.
        </p>
        <textarea
          rows={12}
          value={contextMd}
          onChange={(e) => setContextMd(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
      </div>

      {message && <p className="profile-success">{message}</p>}
      {error && <p className="profile-error">{error}</p>}

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
          {saving ? "Saving..." : "Save All"}
        </button>
      </div>
    </div>
  );
}