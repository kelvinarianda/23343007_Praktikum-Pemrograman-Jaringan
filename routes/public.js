const express = require("express");
const Berita = require("../models/Berita");
const { ambilHargaEmasLatest } = require("../services/emasService"); // kamu sudah punya
const marketService = require("../services/marketService"); // kalau belum ada, abaikan & pakai cara kamu yg USD/IDR

const router = express.Router();

/**
 * Homepage publik:
 * - USD/IDR
 * - Harga Emas
 * - Chart emas tetap via fetch di frontend (pakai route /api/market/emas/riwayat)
 * - 3 berita terbaru (publish)
 */
router.get("/", async (req, res) => {
  try {
    // ===== ambil 3 berita publish terbaru =====
    const berita = await Berita.find({ status: "publish" })
      .sort({ createdAt: -1 })
      .limit(6);

    // ===== ambil USD/IDR (pakai logic kamu yang sekarang) =====
    // Kalau kamu sudah punya marketService untuk USD/IDR, pakai itu.
    // Jika belum, kamu bisa tetap ngisi dari controller dashboard yang lama.
    let usdIdr = null;
    let usdIdrWaktu = "-";
    let usdIdrSumber = "open.er-api.com";

    try {
      // sesuaikan dengan service kamu sendiri jika berbeda
      const fx = await marketService.ambilUsdIdr?.();
      if (fx) {
        usdIdr = fx.harga;
        usdIdrWaktu = fx.waktu_update || "-";
        usdIdrSumber = fx.sumber || usdIdrSumber;
      }
    } catch (_) {}

    // ===== ambil Emas latest (MetalpriceAPI) =====
    let emas = null;
    try {
      const emasLatest = await ambilHargaEmasLatest();
      emas = {
        harga: emasLatest.hargaUsdPerOz,
        waktu_update: emasLatest.data?.timestamp
          ? new Date(emasLatest.data.timestamp * 1000).toUTCString()
          : (emasLatest.data?.date || "-"),
        sumber: "metalpriceapi.com",
        satuan: "USD/oz",
      };
    } catch (_) {
      emas = { harga: null, waktu_update: "-", sumber: "metalpriceapi.com", satuan: "USD/oz" };
    }

    return res.render("home", {
      pengguna: req.session?.pengguna || null,
      usdIdr,
      usdIdrWaktu,
      usdIdrSumber,
      emas,
      berita,
    });
  } catch (err) {
    console.error("Gagal render home:", err.message);
    return res.status(500).send("Terjadi kesalahan pada server.");
  }
});

/**
 * Detail berita publik
 */
router.get("/berita/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const item = await Berita.findOne({ slug, status: "publish" });

    if (!item) return res.status(404).send("Berita tidak ditemukan.");

    return res.render("berita_detail", {
      pengguna: req.session?.pengguna || null,
      berita: item,
    });
  } catch (err) {
    console.error("Gagal render detail berita:", err.message);
    return res.status(500).send("Terjadi kesalahan pada server.");
  }
});

module.exports = router;
