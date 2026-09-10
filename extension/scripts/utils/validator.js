function validateApplication(data) {
  const requiredFields = [
    { field: "job_role", label: "Job Role" },
    { field: "company_name", label: "Company Name" },
    { field: "date_applied", label: "Date Applied" },
    { field: "application_email", label: "Application Email" },
    { field: "application_platform", label: "Application Platform" },
    { field: "employment_type", label: "Employment Type" },
    { field: "job_description", label: "Job Description" },
  ];

  for (const { field, label } of requiredFields) {
    if (!data[field] || (typeof data[field] === "string" && !data[field].trim())) {
      return `${label} is required.`;
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.application_email)) {
    return "Please enter a valid email address.";
  }

  if (data.job_url) {
    try {
      new URL(data.job_url);
    } catch {
      return "Please enter a valid URL.";
    }
  }

  const validTypes = ["Internship", "Full Time", "Part Time", "Contract", "Freelance"];
  if (!validTypes.includes(data.employment_type)) {
    return "Please select a valid employment type.";
  }

  const validStatuses = ["Applied", "Interview", "Rejected", "Offer", "Accepted", "Withdrawn"];
  if (data.status && !validStatuses.includes(data.status)) {
    return "Please select a valid status.";
  }

  return null;
}
