const crypto = require("crypto");

function generateId() {
  return "job_" + crypto.randomBytes(6).toString("hex");
}

function generateTemplateId() {
  return "tpl_" + crypto.randomBytes(6).toString("hex");
}

module.exports = { generateId, generateTemplateId };
