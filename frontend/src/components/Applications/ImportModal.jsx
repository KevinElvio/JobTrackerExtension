import { useState, useRef, Fragment } from "react";
import { api } from "../../api/client";

const STEPS = { SELECT: "select", PREVIEW: "preview", RESULT: "result" };

export default function ImportModal({ onClose, onComplete }) {
  const [step, setStep] = useState(STEPS.SELECT);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState("skip");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [rowPolicies, setRowPolicies] = useState({});
  const [expandedErrors, setExpandedErrors] = useState(new Set());
  const fileInputRef = useRef(null);

  const acceptedTypes = ".csv,.xlsx,.xls";

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    const ext = selected.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      setError("Only .csv, .xlsx, and .xls files are allowed.");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    setFile(selected);
    setFileName(selected.name);
    setError("");
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    const res = await api.previewImport(file);
    setLoading(false);

    if (!res.success) {
      setError(res.message);
      return;
    }

    setPreviewData(res.data);
    setStep(STEPS.PREVIEW);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    const res = await api.executeImport(file, duplicatePolicy);
    setLoading(false);

    if (!res.success) {
      setError(res.message);
      return;
    }

    setResult(res.data);
    setStep(STEPS.RESULT);
  };

  const handleRowPolicyChange = (index, policy) => {
    setRowPolicies((prev) => ({ ...prev, [index]: policy }));
  };

  const handleBulkPolicy = (policy) => {
    if (!previewData) return;
    const updates = {};
    previewData.rows
      .filter((r) => r.isDuplicate)
      .forEach((r) => { updates[r.index] = policy; });
    setRowPolicies(updates);
  };

  const getRowPolicy = (row) => {
    if (!row.isDuplicate) return null;
    return rowPolicies[row.index] || duplicatePolicy;
  };

  const toggleErrorExpand = (index) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDone = () => {
    if (onComplete) onComplete();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    await api.downloadTemplate();
  };

  if (step === STEPS.SELECT) {
    return (
      <div className="modal" onClick={onClose}>
        <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Import Applications</h2>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div className="import-body">
            <p className="import-desc">Upload a CSV or Excel file to bulk import job applications.</p>

            <div className="import-template-hint">
              <span>Don&apos;t have a file?</span>
              <button className="btn btn-ghost btn-sm" onClick={handleDownloadTemplate}>
                Download Template
              </button>
            </div>

            <div
              className={`import-dropzone ${file ? "has-file" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) {
                  const syntheticEvent = { target: { files: [droppedFile] } };
                  handleFileSelect(syntheticEvent);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes}
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              {file ? (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <polyline points="9 15 11 17 15 13" />
                  </svg>
                  <span className="import-filename">{fileName}</span>
                  <span className="import-filesize">{(file.size / 1024).toFixed(1)} KB</span>
                </>
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Click or drag a file here</span>
                  <span className="import-hint">Supports .csv, .xlsx, .xls (max 5MB)</span>
                </>
              )}
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!file || loading}
                onClick={handlePreview}
              >
                {loading ? "Processing..." : "Preview"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === STEPS.PREVIEW) {
    const { rows, summary } = previewData;
    const duplicateRows = rows.filter((r) => r.isDuplicate);
    const hasDuplicates = duplicateRows.length > 0;

    return (
      <div className="modal" onClick={onClose}>
        <div className="modal-content import-modal import-modal-wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Preview Import</h2>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div className="import-body">
            <div className="import-summary">
              <span className="import-summary-item">Total: <strong>{summary.total}</strong></span>
              <span className="import-summary-item import-summary-valid">Valid: <strong>{summary.valid}</strong></span>
              {summary.duplicates > 0 && (
                <span className="import-summary-item import-summary-dup">Duplicates: <strong>{summary.duplicates}</strong></span>
              )}
              {summary.errors > 0 && (
                <span className="import-summary-item import-summary-err">Errors: <strong>{summary.errors}</strong></span>
              )}
            </div>

            {hasDuplicates && (
              <div className="import-duplicate-controls">
                <span className="import-dup-label">Duplicate handling:</span>
                <select className="input-sm" value={duplicatePolicy} onChange={(e) => { setDuplicatePolicy(e.target.value); handleBulkPolicy(e.target.value); }}>
                  <option value="skip">Skip all duplicates</option>
                  <option value="overwrite">Overwrite all duplicates</option>
                  <option value="duplicate">Keep as new (allow duplicates)</option>
                </select>
              </div>
            )}

            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Job Role</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>URL</th>
                    <th>Issues</th>
                    {hasDuplicates && <th>Duplicate Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const rowPolicy = getRowPolicy(row);
                    const isExpanded = expandedErrors.has(row.index);
                    return (
                      <Fragment key={row.index}>
                        <tr
                          className={
                            !row.isValid ? "import-row-error" :
                            row.isDuplicate && rowPolicy === "skip" ? "import-row-skip" :
                            row.isDuplicate ? "import-row-dup" : ""
                          }
                        >
                          <td>{row.index}</td>
                          <td title={row.data.job_role}>{row.data.job_role || "-"}</td>
                          <td title={row.data.company_name}>{row.data.company_name || "-"}</td>
                          <td>{row.data.status || "Applied"}</td>
                          <td title={row.data.job_url} className="import-url-cell">{row.data.job_url || "-"}</td>
                          <td>
                            {!row.isValid && (
                              <button
                                type="button"
                                className={`import-error-badge ${isExpanded ? "expanded" : ""}`}
                                onClick={(e) => { e.stopPropagation(); toggleErrorExpand(row.index); }}
                              >
                                {row.errors.length} error(s)
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            )}
                            {row.isValid && !row.isDuplicate && (
                              <span className="import-ok-badge">OK</span>
                            )}
                            {row.isDuplicate && row.isValid && (
                              <span className="import-dup-badge">Duplicate</span>
                            )}
                          </td>
                          {hasDuplicates && (
                            <td onClick={(e) => e.stopPropagation()}>
                              {row.isDuplicate && (
                                <select
                                  className="input-sm import-row-select"
                                  value={rowPolicy}
                                  onChange={(e) => handleRowPolicyChange(row.index, e.target.value)}
                                >
                                  <option value="skip">Skip</option>
                                  <option value="overwrite">Overwrite</option>
                                  <option value="duplicate">Keep double</option>
                                </select>
                              )}
                            </td>
                          )}
                        </tr>
                        {!row.isValid && isExpanded && (
                          <tr className="import-error-expand-row">
                            <td colSpan={hasDuplicates ? 7 : 6}>
                              <div className="import-error-expand">
                                {row.errors.map((errMsg, ei) => (
                                  <div key={ei} className="import-error-msg">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="12" y1="8" x2="12" y2="12" />
                                      <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{errMsg}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { setStep(STEPS.SELECT); setFile(null); setFileName(""); setPreviewData(null); setRowPolicies({}); }}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading || summary.valid === 0 && summary.duplicates === 0}
                onClick={handleImport}
              >
                {loading ? "Importing..." : `Import ${summary.valid + (hasDuplicates ? duplicateRows.length : 0)} row(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === STEPS.RESULT) {
    return (
      <div className="modal" onClick={onClose}>
        <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Import Result</h2>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div className="import-body">
            <div className="import-result">
              <div className="import-result-icon">
                {result.imported > 0 ? (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
              </div>

              <div className="import-result-stats">
                {result.imported > 0 && (
                  <div className="import-result-stat import-result-success">
                    <span className="import-result-num">{result.imported}</span>
                    <span className="import-result-label">Imported</span>
                  </div>
                )}
                {result.updated > 0 && (
                  <div className="import-result-stat import-result-updated">
                    <span className="import-result-num">{result.updated}</span>
                    <span className="import-result-label">Updated</span>
                  </div>
                )}
                {result.skipped > 0 && (
                  <div className="import-result-stat import-result-skipped">
                    <span className="import-result-num">{result.skipped}</span>
                    <span className="import-result-label">Skipped</span>
                  </div>
                )}
                {result.errorCount > 0 && (
                  <div className="import-result-stat import-result-errors">
                    <span className="import-result-num">{result.errorCount}</span>
                    <span className="import-result-label">Errors</span>
                  </div>
                )}
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="import-result-errors-list">
                  <h4>Error Details</h4>
                  {result.errors.map((err, i) => (
                    <div key={i} className="import-result-error-item">
                      <span className="import-result-error-row">Row {err.row}</span>
                      <div className="import-result-error-msgs">
                        {err.errors.map((msg, mi) => (
                          <span key={mi} className="import-result-error-msg">{msg}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={handleDone}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
