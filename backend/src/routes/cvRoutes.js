const { Router } = require("express");
const ctrl = require("../controllers/cvController");

const router = Router();

router.post("/profile/analyze-cv", ctrl.uploadMiddleware, ctrl.analyzeCv);

module.exports = router;