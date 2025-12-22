const express = require("express");
const bcrypt = require("bcrypt");
const Pengguna = require("../models/Pengguna");

const router = express.Router();

// =======================
// GET /register
// =======================
router.get("/register", (req, res) => {
  return res.render("register", {
    error: null,
    form: { nama: "", email: "" },
  });
});

// =======================
// POST /register
// =======================
router.post("/register", async (req, res) => {
  try {
    const nama = (req.body.nama || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();
    const password2 = (req.body.password2 || "").trim();

    // Validasi basic
    if (!nama || !email || !password || !password2) {
      return res.status(400).render("register", {
        error: "Semua field wajib diisi.",
        form: { nama, email },
      });
    }
    if (password.length < 6) {
      return res.status(400).render("register", {
        error: "Password minimal 6 karakter.",
        form: { nama, email },
      });
    }
    if (password !== password2) {
      return res.status(400).render("register", {
        error: "Konfirmasi password tidak sama.",
        form: { nama, email },
      });
    }

    // Cek email sudah ada?
    const ada = await Pengguna.findOne({ email });
    if (ada) {
      return res.status(400).render("register", {
        error: "Email sudah terdaftar. Silakan login.",
        form: { nama, email },
      });
    }

    // Simpan ke DB
    const hash = await bcrypt.hash(password, 10);
    const userBaru = await Pengguna.create({
      nama,
      email,
      kata_sandi_hash: hash,
      peran: "user",
    });

    // Auto login setelah daftar
    req.session.pengguna = {
      id: userBaru._id.toString(),
      nama: userBaru.nama,
      email: userBaru.email,
      peran: userBaru.peran,
    };

    return res.redirect("/dashboard");
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).render("register", {
      error: "Terjadi kesalahan server saat mendaftar.",
      form: { nama: req.body.nama || "", email: req.body.email || "" },
    });
  }
});

// =======================
// GET /login
// =======================
router.get("/login", (req, res) => {
  return res.render("login", { error: null, form: { email: "" } });
});

// =======================
// POST /login
// =======================
router.post("/login", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();

    if (!email || !password) {
      return res.status(400).render("login", {
        error: "Email dan password wajib diisi.",
        form: { email },
      });
    }

    const user = await Pengguna.findOne({ email });
    if (!user) {
      return res.status(400).render("login", {
        error: "Email tidak terdaftar.",
        form: { email },
      });
    }

    const cocok = await bcrypt.compare(password, user.kata_sandi_hash);
    if (!cocok) {
      return res.status(400).render("login", {
        error: "Password salah.",
        form: { email },
      });
    }

    req.session.pengguna = {
      id: user._id.toString(),
      nama: user.nama,
      email: user.email,
      peran: user.peran,
    };

    return res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render("login", {
      error: "Terjadi kesalahan server saat login.",
      form: { email: req.body.email || "" },
    });
  }
});

// =======================
// POST /logout
// =======================
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    return res.redirect("/");
  });
});

module.exports = router;
