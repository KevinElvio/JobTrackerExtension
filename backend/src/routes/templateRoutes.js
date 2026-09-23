const { Router } = require("express");
const { authenticate } = require("../middleware/auth");
const ctrl = require("../controllers/templateController");

const router = Router();

router.get("/templates", authenticate, ctrl.list);
router.post("/templates", authenticate, ctrl.create);
router.get("/templates/:id", authenticate, ctrl.getById);
router.put("/templates/:id", authenticate, ctrl.update);
router.delete("/templates/:id", authenticate, ctrl.remove);
router.post("/templates/:id/render", authenticate, ctrl.render);

module.exports = router;
