const express = require("express");
const axios = require("axios");
const HargaEmas = require("../models/HargaEmas");

const router = express.Router();

// =======================
// Helper
// =======================
function formatTanggal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// XAU per USD → USD per oz
function rateKeHargaUsdPerOz(rateXau) {
  if (!rateXau || rateXau <= 0) return null;
  return 1 / rateXau;
}

// =======================
// GET /api/public/usd-idr
// =======================
router.get("/usd-idr", async (req, res) => {
  try {
    const url = "https://open.er-api.com/v6/latest/USD";
    const { data } = await axios.get(url, { timeout: 15000 });

    const idr = data?.rates?.IDR;
    if (!idr) throw new Error("Rates IDR tidak ditemukan");

    return res.json({
      ok: true,
      data: {
        idr,
        sumber: "open.er-api.com",
        waktu_update: data?.time_last_update_utc || "-",
      },
    });
  } catch (err) {
    console.error("PUBLIC usd-idr error:", err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      pesan: "Gagal ambil USD/IDR",
      detail: err.response?.data || err.message,
    });
  }
});

// =======================
// GET /api/public/emas/latest
// =======================
router.get("/emas/latest", async (req, res) => {
  try {
    const apiKey = process.env.METAL_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ ok: false, pesan: "METAL_API_KEY belum diisi" });
    }

    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=XAU`;
    const { data } = await axios.get(url, { timeout: 15000 });

    if (!data?.success) {
      return res.status(400).json({ ok: false, pesan: data?.error?.message || "MetalpriceAPI gagal" });
    }

    const rateXau = data?.rates?.XAU;
    const hargaUsdPerOz = rateKeHargaUsdPerOz(rateXau);

    // simpan fallback DB 1x per hari
    const hariIni = formatTanggal(new Date());
    const sudahAda = await HargaEmas.findOne({ tanggal: hariIni });

    if (!sudahAda && hargaUsdPerOz) {
      await HargaEmas.create({
        tanggal: hariIni,
        harga_usd_per_oz: Number(hargaUsdPerOz.toFixed(4)),
        sumber: "metalpriceapi.com",
        raw: data,
      });
    }

    return res.json({
      ok: true,
      data: {
        hargaUsdPerOz,
        rateXau,
        timestamp: data?.timestamp || null,
        sumber: "metalpriceapi.com",
      },
    });
  } catch (err) {
    console.error("PUBLIC emas latest error:", err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      pesan: "Gagal ambil emas",
      detail: err.response?.data || err.message,
    });
  }
});

// =======================
// GET /api/public/emas/riwayat?hari=7
// - coba timeseries
// - fallback MongoDB
// =======================
router.get("/emas/riwayat", async (req, res) => {
  try {
    const apiKey = process.env.METAL_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ ok: false, pesan: "METAL_API_KEY belum diisi" });
    }

    const hari = Math.max(2, Math.min(60, parseInt(req.query.hari || "7", 10)));

    const akhir = new Date();
    const awal = new Date();
    awal.setDate(akhir.getDate() - (hari - 1));

    const start_date = formatTanggal(awal);
    const end_date = formatTanggal(akhir);

    // 1) coba timeseries API
    try {
      const url = `https://api.metalpriceapi.com/v1/timeseries?api_key=${apiKey}&start_date=${start_date}&end_date=${end_date}&base=USD&currencies=XAU`;
      const { data } = await axios.get(url, { timeout: 15000 });

      if (data?.success && data?.rates) {
        return res.json({
          ok: true,
          sumber: "api_timeseries",
          data,
          meta: { hari, start_date, end_date },
        });
      }

      throw new Error(data?.error?.message || "Timeseries tidak tersedia");
    } catch (e) {
      // 2) fallback MongoDB
      const rows = await HargaEmas.find({}).sort({ tanggal: -1 }).limit(hari);

      const data_histori = rows.reverse().map((x) => ({
        tanggal: x.tanggal,
        harga_usd_per_oz: x.harga_usd_per_oz,
      }));

      return res.json({
        ok: true,
        sumber: "mongodb_fallback",
        data_histori,
        meta: { hari, start_date, end_date },
        catatan: "Timeseries MetalpriceAPI tidak tersedia, pakai histori MongoDB.",
      });
    }
  } catch (err) {
    console.error("PUBLIC emas riwayat error:", err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      pesan: "Gagal ambil chart emas",
      detail: err.response?.data || err.message,
    });
  }
});

// =======================
// BITCOIN (CoinGecko - FREE no key)
// =======================

// cache sederhana biar gak hit API terus (anti rate-limit)
let cacheBtcLatest = { ts: 0, data: null };
const CACHE_MS = 30 * 1000; // 30 detik

async function ambilBitcoinLatest() {
  const now = Date.now();
  if (cacheBtcLatest.data && now - cacheBtcLatest.ts < CACHE_MS) {
    return cacheBtcLatest.data;
  }

  const url =
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,idr&include_last_updated_at=true";

  const { data } = await axios.get(url, { timeout: 15000 });

  const btc = data?.bitcoin;
  if (!btc?.usd || !btc?.idr) throw new Error("Data bitcoin dari CoinGecko tidak valid.");

  const hasil = {
    usd: btc.usd,
    idr: btc.idr,
    last_updated_at: btc.last_updated_at || null,
    sumber: "coingecko.com",
  };

  cacheBtcLatest = { ts: now, data: hasil };
  return hasil;
}

// GET /api/public/bitcoin/latest
router.get("/bitcoin/latest", async (req, res) => {
  try {
    const btc = await ambilBitcoinLatest();
    return res.json({ ok: true, data: btc });
  } catch (err) {
    console.error("PUBLIC bitcoin latest error:", err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      pesan: "Gagal mengambil harga Bitcoin (public).",
      detail: err.response?.data || err.message,
    });
  }
});

// GET /api/public/bitcoin/chart?hari=7  (optional chart, tapi aku sekalian siapin)
router.get("/bitcoin/chart", async (req, res) => {
  try {
    const hari = Math.max(1, Math.min(90, parseInt(req.query.hari || "7", 10)));
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${hari}`;

    const { data } = await axios.get(url, { timeout: 15000 });

    // data.prices format: [[timestampMs, price], ...]
    if (!Array.isArray(data?.prices)) throw new Error("Format chart CoinGecko tidak valid.");

    return res.json({
      ok: true,
      sumber: "coingecko.com",
      data: {
        hari,
        prices: data.prices,
      },
    });
  } catch (err) {
    console.error("PUBLIC bitcoin chart error:", err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      pesan: "Gagal mengambil chart Bitcoin (public).",
      detail: err.response?.data || err.message,
    });
  }
});

module.exports = router;
