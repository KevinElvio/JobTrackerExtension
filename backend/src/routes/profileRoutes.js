const { Router } = require("express");
const ctrl = require("../controllers/profileController");

const router = Router();

router.get("/profile", ctrl.getProfile);
router.put("/profile", ctrl.updateProfile);
router.get("/profile/context", ctrl.getContext);
router.put("/profile/context", ctrl.updateContext);

module.exports = router;