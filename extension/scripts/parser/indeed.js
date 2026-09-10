const IndeedParser = {
  parse(data) {
    const jobTitleEl = document.querySelector(
      "h1.jobsearch-JobInfoHeader-title, h1.job-title"
    );
    if (jobTitleEl) data.role = jobTitleEl.textContent.trim();

    const companyEl = document.querySelector(
      "div.jobsearch-CompanyInfoButton a, span.jobsearch-InlineHeader-companyName"
    );
    if (companyEl) data.company = companyEl.textContent.trim();

    const locationEl = document.querySelector(
      "div.jobsearch-JobInfoHeader-subtitle div, div.jobsearch-JobLocation"
    );
    if (locationEl) data.location = locationEl.textContent.trim();

    const salaryEl = document.querySelector(
      "div.jobsearch-JobMetadataHeader-item span, span.salary-text"
    );
    if (salaryEl) data.salary = salaryEl.textContent.trim();

    const descEl = document.querySelector(
      "div.jobsearch-jobDescriptionText, div.job-description"
    );
    if (descEl) data.description = descEl.textContent.trim();

    return data;
  },
};
