const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./src/config");
const routes = require("./src/routes");
const templateRoutes = require("./src/routes/templateRoutes");
const profileRoutes = require("./src/routes/profileRoutes");

const app = express();

app.use(
  cors({
    origin: [
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      "http://localhost:3000",
      "http://localhost:8000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/api", routes);
app.use("/api", templateRoutes);
app.use("/api", profileRoutes);

app.use((err, _req, res, next) => {
  if (err instanceof (require("multer").MulterError)) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ success: false, message: "Upload error: " + err.message });
  }
  if (err.message && err.message.includes("Only .csv")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const frontendBuild = path.join(__dirname, "public");
app.use(express.static(frontendBuild));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendBuild, "index.html"));
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
