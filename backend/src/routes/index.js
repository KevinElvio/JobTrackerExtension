const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ctrl = require("../controllers/applicationController");

const router = Router();

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "import-" + unique + ext);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [".csv", ".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .csv, .xlsx, and .xls files are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/applications", ctrl.create);
router.get("/applications", ctrl.list);
router.get("/applications/template", ctrl.template);
router.post("/applications/preview", upload.single("file"), ctrl.preview);
router.post("/applications/import", upload.single("file"), ctrl.import);
router.get("/applications/:id", ctrl.getById);
router.put("/applications/:id", ctrl.update);
router.delete("/applications/:id", ctrl.remove);
router.get("/statistics", ctrl.statistics);

module.exports = router;