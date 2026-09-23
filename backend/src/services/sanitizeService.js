const MAX_DESCRIPTION_LENGTH = 10000;

function sanitizeString(value) {
  if (!value || typeof value !== "string") return value;

  let result = value.trim();
  result = result.replace(/\r\n|\r|\n/g, "\n");
  result = result.replace(/<br\s*\/?>/gi, "\n");
  result = result.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n");
  result = result.replace(/<[^>]+>/g, "");
  result = result.replace(/&amp;/g, "&");
  result = result.replace(/&lt;/g, "<");
  result = result.replace(/&gt;/g, ">");
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");
  result = result.replace(/&nbsp;/g, " ");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/[ \t]+/g, " ");

  return result.trim();
}

function sanitizeApplication(data) {
  const textFields = [
    "job_role",
    "company_name",
    "location",
    "application_email",
    "application_platform",
    "salary_range",
    "notes",
  ];

  textFields.forEach((field) => {
    if (data[field] != null) {
      data[field] = sanitizeString(data[field]);
    }
  });

  if (data.job_description) {
    data.job_description = sanitizeString(data.job_description);
    if (data.job_description.length > MAX_DESCRIPTION_LENGTH) {
      data.job_description = data.job_description.slice(0, MAX_DESCRIPTION_LENGTH);
    }
  }

  return data;
}

module.exports = { sanitizeApplication, sanitizeString };
