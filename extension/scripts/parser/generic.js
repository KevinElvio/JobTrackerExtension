const GenericParser = {
  parse(data) {
    const h1 = document.querySelector("h1");
    if (h1) data.role = h1.textContent.trim();

    const metaCompany = document.querySelector(
      'meta[name="company"], meta[property="og:site_name"]'
    );
    if (metaCompany) {
      data.company = metaCompany.getAttribute("content") || "";
    }

    const metaDescription = document.querySelector(
      'meta[name="description"], meta[property="og:description"]'
    );
    if (metaDescription) {
      data.description = metaDescription.getAttribute("content") || "";
    }

    const locationMeta = document.querySelector('meta[name="location"]');
    if (locationMeta) {
      data.location = locationMeta.getAttribute("content") || "";
    }

    return data;
  },
};
