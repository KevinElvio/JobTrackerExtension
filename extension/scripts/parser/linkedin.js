const LinkedInParser = {
  parse(data) {
    const jobTitleEl = document.querySelector(
      "h1.top-card-layout__title, h1.job-details-jobs-unified-top-card__job-title"
    );
    if (jobTitleEl) data.role = jobTitleEl.textContent.trim();

    const companyEl = document.querySelector(
      "a.topcard__org-name-link, span.job-details-jobs-unified-top-card__company-name"
    );
    if (companyEl) data.company = companyEl.textContent.trim();

    const locationEl = document.querySelector(
      "span.topcard__flavor--bullet, span.job-details-jobs-unified-top-card__bullet"
    );
    if (locationEl) data.location = locationEl.textContent.trim();

    const salaryEl = document.querySelector(
      "div.salary, div.job-details-jobs-unified-top-card__job-insight span"
    );
    if (salaryEl) data.salary = salaryEl.textContent.trim();

    const descEl = document.querySelector(
      "div.description__text, div.job-details-jobs-unified-top-card__description"
    );
    if (descEl) data.description = descEl.textContent.trim();

    const criteriaItems = document.querySelectorAll(
      "span.job-criteria__subheader, li.job-criteria__list-item"
    );
    criteriaItems.forEach((item) => {
      const text = item.textContent.trim().toLowerCase();
      if (text.includes("employment type")) {
        const valueEl = item.querySelector("span") || item.nextElementSibling;
        if (valueEl) {
          data.employment_type = this.normalizeType(valueEl.textContent.trim());
        }
      }
    });

    return data;
  },

  normalizeType(type) {
    const lower = type.toLowerCase();
    if (lower.includes("intern")) return "Internship";
    if (lower.includes("full")) return "Full Time";
    if (lower.includes("part")) return "Part Time";
    if (lower.includes("contract")) return "Contract";
    if (lower.includes("freelanc")) return "Freelance";
    return type;
  },
};
