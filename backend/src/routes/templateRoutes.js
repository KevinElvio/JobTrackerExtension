const { Router } = require("express");
const ctrl = require("../controllers/templateController");

const router = Router();

router.get("/templates", ctrl.list);
router.post("/templates", ctrl.create);
router.get("/templates/:id", ctrl.getById);
router.put("/templates/:id", ctrl.update);
router.delete("/templates/:id", ctrl.remove);
router.post("/templates/:id/render", ctrl.render);

module.exports = router;