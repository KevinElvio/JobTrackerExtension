const config = require("../config");

const AUTH_TOKEN = config.apiToken;

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Missing or invalid token." });
  }

  const token = header.split(" ")[1];

  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }

  next();
}

module.exports = { authenticate };
