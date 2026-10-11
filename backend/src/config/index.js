require("dotenv").config();

module.exports = {
  port: process.env.PORT || 8000,
  csvPath: process.env.CSV_FILE_PATH || "./data/applications.csv",
  csvTemplatesPath: process.env.CSV_TEMPLATES_PATH || "./data/templates.csv",
};