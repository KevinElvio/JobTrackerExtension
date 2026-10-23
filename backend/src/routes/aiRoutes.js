const { Router } = require("express");
const ctrl = require("../controllers/aiController");

const router = Router();

router.post("/ai/generate", ctrl.generate);
router.post("/ai/extract", ctrl.extract);

module.exports = router;