const { Router } = require("express");
const ctrl = require("../controllers/aiController");

const router = Router();

router.get("/ai/health", ctrl.health);
router.post("/ai/generate", ctrl.generate);
router.post("/ai/extract", ctrl.extract);

module.exports = router;