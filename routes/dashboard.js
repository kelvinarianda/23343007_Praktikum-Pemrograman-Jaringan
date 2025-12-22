const express = require("express");
const Berita = require("../models/Berita");
const { wajibLogin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/dashboard", wajibLogin, async (req, res) => {
  try {
    const beritaTerbaru = await Berita.find({ status: "publish" })
      .sort({ createdAt: -1 })
      .limit(6);

    // Kartu awal (nilai akan di-update via fetch client)
    const kartu = [
      {
        nama: "USD/IDR",
        harga: null,
        satuan: "IDR",
        sumber: "open.er-api.com",
        waktu_update: "-",
        key: "usd_idr",
      },
    ];

    return res.render("dashboard", {
      pengguna: req.session.pengguna,
      kartu,
      beritaTerbaru,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).send("Terjadi kesalahan saat memuat dashboard.");
  }
});

module.exports = router;
