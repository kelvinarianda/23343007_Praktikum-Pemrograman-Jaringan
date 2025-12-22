const axios = require("axios");
const HargaEmas = require("../models/HargaEmas");

/**
 * Format tanggal: YYYY-MM-DD
 */
function formatTanggal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Konversi rate menjadi USD/oz.
 * MetalpriceAPI kadang ngasih:
 * - rates.USDxAU (mis: USDXAU: 4326.15) => SUDAH USD/oz (1 XAU dalam USD)
 * - rates.XAU (mis: 0.000231) => XAU per 1 USD => harus dibalik jadi USD/oz
 */
function hitungHargaUsdPerOz(d) {
  const rates = d?.rates || {};

  // opsi 1: langsung ada USDXAU
  if (typeof rates.USDXAU === "number" && rates.USDXAU > 0) {
    return rates.USDXAU;
  }

  // opsi 2: ada XAU per USD -> balikkan
  if (typeof rates.XAU === "number" && rates.XAU > 0) {
    return 1 / rates.XAU;
  }

  return null;
}

/**
 * Ambil harga emas terbaru (live) dari MetalpriceAPI
 */
async function ambilHargaEmasLatest() {
  const apiKey = process.env.METAL_API_KEY;
  if (!apiKey) throw new Error("METAL_API_KEY belum diisi di .env");

  const url = `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=XAU`;

  const { data } = await axios.get(url, { timeout: 15000 });

  if (!data?.success) {
    throw new Error(data?.error?.message || "MetalpriceAPI gagal (latest)");
  }

  const hargaUsdPerOz = hitungHargaUsdPerOz(data);
  if (!hargaUsdPerOz) throw new Error("Tidak menemukan rates USDXAU / XAU dari API");

  return {
    raw: data,
    hargaUsdPerOz: Number(hargaUsdPerOz.toFixed(4)),
    waktuUpdate: data?.timestamp ? new Date(data.timestamp * 1000).toUTCString() : "-",
    sumber: "metalpriceapi.com",
  };
}

/**
 * Simpan harga emas harian (1 data per tanggal) ke MongoDB.
 * Ini berguna buat chart jika paket gratis tidak punya timeseries.
 */
async function simpanHargaEmasHarianJikaBelumAda() {
  const hariIni = formatTanggal(new Date());

  const sudahAda = await HargaEmas.findOne({ tanggal: hariIni });
  if (sudahAda) {
    return { ok: true, status: "skip", pesan: `Data emas ${hariIni} sudah ada.` };
  }

  const latest = await ambilHargaEmasLatest();

  await HargaEmas.create({
    tanggal: hariIni,
    harga_usd_per_oz: latest.hargaUsdPerOz,
    sumber: latest.sumber,
    raw: latest.raw,
  });

  return { ok: true, status: "insert", pesan: `Data emas ${hariIni} disimpan.` };
}

/**
 * Ambil histori emas dari MongoDB (untuk chart).
 */
async function ambilHistoriEmas(hari = 30) {
  const batas = Math.max(2, Math.min(365, parseInt(hari, 10) || 30));

  const data = await HargaEmas.find({})
    .sort({ tanggal: -1 })
    .limit(batas);

  return data.reverse(); // urut lama -> baru
}

module.exports = {
  ambilHargaEmasLatest,
  simpanHargaEmasHarianJikaBelumAda,
  ambilHistoriEmas,
};
