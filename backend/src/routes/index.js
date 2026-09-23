const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate } = require("../middleware/auth");
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

router.post("/applications", authenticate, ctrl.create);
router.get("/applications", authenticate, ctrl.list);
router.get("/applications/template", authenticate, ctrl.template);
router.post("/applications/preview", authenticate, upload.single("file"), ctrl.preview);
router.post("/applications/import", authenticate, upload.single("file"), ctrl.import);
router.get("/applications/:id", authenticate, ctrl.getById);
router.put("/applications/:id", authenticate, ctrl.update);
router.delete("/applications/:id", authenticate, ctrl.remove);
router.get("/statistics", authenticate, ctrl.statistics);

module.exports = router;
