const express = require("express");
const router = express.Router();

const {
  ambilHargaEmasLatest,
  simpanHargaEmasHarianJikaBelumAda,
  ambilHistoriEmas,
} = require("../services/emasService");

/**
 * GET /api/market/emas/latest
 * - Ambil harga emas terbaru dari API (live)
 * - Sekaligus simpan 1 data harian ke MongoDB (buat chart)
 */
router.get("/emas/latest", async (req, res) => {
  try {
    // simpan harian agar chart selalu punya data
    await simpanHargaEmasHarianJikaBelumAda();

    const latest = await ambilHargaEmasLatest();

    return res.json({
      ok: true,
      harga_usd_per_oz: latest.hargaUsdPerOz,
      sumber: latest.sumber,
      waktu_update: latest.waktuUpdate,
      raw: latest.raw,
    });
  } catch (err) {
    console.error("Gagal /emas/latest:", err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      pesan: "Gagal mengambil harga emas (latest).",
      detail: err.response?.data || err.message,
    });
  }
});

/**
 * GET /api/market/emas/histori?hari=30
 * Ambil histori dari MongoDB untuk chart
 */
router.get("/emas/histori", async (req, res) => {
  try {
    const hari = Math.max(2, Math.min(365, parseInt(req.query.hari || "30", 10)));

    // pastikan minimal ada data hari ini
    await simpanHargaEmasHarianJikaBelumAda();

    const histori = await ambilHistoriEmas(hari);

    return res.json({
      ok: true,
      hari,
      histori: histori.map((x) => ({
        tanggal: x.tanggal,
        harga_usd_per_oz: x.harga_usd_per_oz,
        sumber: x.sumber,
      })),
    });
  } catch (err) {
    console.error("Gagal /emas/histori:", err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      pesan: "Gagal mengambil histori emas.",
      detail: err.response?.data || err.message,
    });
  }
});

module.exports = router;
