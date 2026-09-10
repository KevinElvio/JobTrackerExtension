const PlatformDetector = {
  detect(hostname) {
    if (hostname.includes("linkedin.com")) return "LinkedIn";
    if (hostname.includes("jobstreet")) return "JobStreet";
    if (hostname.includes("indeed.")) return "Indeed";
    if (hostname.includes("glints.")) return "Glints";
    if (hostname.includes("kalibrr.")) return "Kalibrr";
    return "Company Website";
  },
};

function detectPlatformFromHostname(hostname) {
  return PlatformDetector.detect(hostname);
}
