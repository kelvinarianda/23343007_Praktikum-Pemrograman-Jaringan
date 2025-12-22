const express = require("express");
const Berita = require("../models/Berita");
const { wajibAdmin } = require("../middlewares/authMiddleware");
const { uploadBerita } = require("../config/uploadBerita");

const router = express.Router();

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function buatSlugUnik(judul, excludeId = null) {
  const base = slugify(judul);
  let slug = base || `berita-${Date.now()}`;
  let i = 1;

  while (true) {
    const q = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
    const ada = await Berita.findOne(q);
    if (!ada) return slug;
    slug = `${base || "berita"}-${i++}`;
  }
}

// List berita
router.get("/admin/berita", wajibAdmin, async (req, res) => {
  const list = await Berita.find({}).sort({ createdAt: -1 }).limit(100);
  return res.render("admin_berita_list", { pengguna: req.session.pengguna, list });
});

// Form tambah
router.get("/admin/berita/tambah", wajibAdmin, (req, res) => {
  return res.render("admin_berita_form", {
    pengguna: req.session.pengguna,
    mode: "tambah",
    berita: null,
    error: null,
  });
});

// Proses tambah
router.post("/admin/berita/tambah", wajibAdmin, uploadBerita.single("gambar"), async (req, res) => {
  try {
    const { judul, ringkasan, isi, status } = req.body;

    if (!judul?.trim()) throw new Error("Judul wajib diisi.");
    if (!isi?.trim()) throw new Error("Isi berita wajib diisi.");
    if (!req.file) throw new Error("Gambar wajib diupload.");

    const slug = await buatSlugUnik(judul);
    const pathGambar = `/uploads/berita/${req.file.filename}`;

    await Berita.create({
      judul,
      slug,
      ringkasan,
      isi,
      status: status || "publish",
      gambar: pathGambar,
      dibuat_oleh: req.session.pengguna?.nama || "admin",
    });

    return res.redirect("/admin/berita");
  } catch (err) {
    return res.status(400).render("admin_berita_form", {
      pengguna: req.session.pengguna,
      mode: "tambah",
      berita: null,
      error: err.message,
    });
  }
});

// Form edit
router.get("/admin/berita/:id/edit", wajibAdmin, async (req, res) => {
  const berita = await Berita.findById(req.params.id);
  if (!berita) return res.status(404).send("Berita tidak ditemukan.");
  return res.render("admin_berita_form", {
    pengguna: req.session.pengguna,
    mode: "edit",
    berita,
    error: null,
  });
});

// Proses edit
router.post("/admin/berita/:id/edit", wajibAdmin, uploadBerita.single("gambar"), async (req, res) => {
  let berita;
  try {
    berita = await Berita.findById(req.params.id);
    if (!berita) return res.status(404).send("Berita tidak ditemukan.");

    const { judul, ringkasan, isi, status } = req.body;

    if (!judul?.trim()) throw new Error("Judul wajib diisi.");
    if (!isi?.trim()) throw new Error("Isi berita wajib diisi.");

    berita.judul = judul;
    berita.ringkasan = ringkasan;
    berita.isi = isi;
    berita.status = status || berita.status;

    berita.slug = await buatSlugUnik(judul, berita._id);

    if (req.file) {
      berita.gambar = `/uploads/berita/${req.file.filename}`;
    }

    await berita.save();
    return res.redirect("/admin/berita");
  } catch (err) {
    return res.status(400).render("admin_berita_form", {
      pengguna: req.session.pengguna,
      mode: "edit",
      berita: berita || null,
      error: err.message,
    });
  }
});

// Hapus
router.post("/admin/berita/:id/hapus", wajibAdmin, async (req, res) => {
  await Berita.findByIdAndDelete(req.params.id);
  return res.redirect("/admin/berita");
});

module.exports = router;
