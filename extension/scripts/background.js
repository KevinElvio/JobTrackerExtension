chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["applicationEmails"], (result) => {
    if (!result.applicationEmails) {
      chrome.storage.local.set({ applicationEmails: [] });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getEmails") {
    chrome.storage.local.get(["applicationEmails"], (result) => {
      sendResponse({ emails: result.applicationEmails || [] });
    });
    return true;
  }

  if (request.action === "addEmail") {
    chrome.storage.local.get(["applicationEmails"], (result) => {
      const emails = result.applicationEmails || [];
      if (!emails.includes(request.email)) {
        emails.push(request.email);
        chrome.storage.local.set({ applicationEmails: emails });
      }
      sendResponse({ emails });
    });
    return true;
  }

  if (request.action === "removeEmail") {
    chrome.storage.local.get(["applicationEmails"], (result) => {
      const emails = (result.applicationEmails || []).filter(
        (e) => e !== request.email
      );
      chrome.storage.local.set({ applicationEmails: emails });
      sendResponse({ emails });
    });
    return true;
  }
});
