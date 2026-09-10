const EmailStorage = {
  async getEmails() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["applicationEmails"], (result) => {
        resolve(result.applicationEmails || []);
      });
    });
  },

  async addEmail(email) {
    const emails = await this.getEmails();
    if (!emails.includes(email)) {
      emails.push(email);
      await new Promise((resolve) => {
        chrome.storage.local.set({ applicationEmails: emails }, resolve);
      });
    }
    return emails;
  },

  async removeEmail(email) {
    const emails = (await this.getEmails()).filter((e) => e !== email);
    await new Promise((resolve) => {
      chrome.storage.local.set({ applicationEmails: emails }, resolve);
    });
    return emails;
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
};
