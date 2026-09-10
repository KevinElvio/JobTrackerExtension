const JobStreetParser = {
  parse(data) {
    const jobTitleEl = document.querySelector(
      "h1.job-title, [data-testid='job-title']"
    );
    if (jobTitleEl) data.role = jobTitleEl.textContent.trim();

    const companyEl = document.querySelector(
      "a.company-name, [data-testid='company-name']"
    );
    if (companyEl) data.company = companyEl.textContent.trim();

    const locationEl = document.querySelector(
      "span.job-location, [data-testid='job-location']"
    );
    if (locationEl) data.location = locationEl.textContent.trim();

    const salaryEl = document.querySelector(
      "span.job-salary, [data-testid='job-salary']"
    );
    if (salaryEl) data.salary = salaryEl.textContent.trim();

    const descEl = document.querySelector(
      "div.job-description, [data-testid='job-description']"
    );
    if (descEl) data.description = descEl.textContent.trim();

    return data;
  },
};
