const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "public", "uploads", "berita");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `berita_${Date.now()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
  if (!ok) return cb(new Error("Format gambar harus JPG/PNG/WEBP."), false);
  cb(null, true);
}

const uploadBerita = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

module.exports = { uploadBerita };
