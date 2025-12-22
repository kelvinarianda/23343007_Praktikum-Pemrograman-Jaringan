const axios = require("axios");

async function ambilKursUSDIDR() {
  // Gratis tanpa API key (open.er-api.com)
  const url = "https://open.er-api.com/v6/latest/USD";
  const { data } = await axios.get(url, { timeout: 15000 });
  const kurs = data?.rates?.IDR;

  if (!kurs) throw new Error("Data kurs tidak tersedia");
  return {
    nama: "USD/IDR",
    harga: kurs,
    satuan: "IDR",
    waktu_update: data.time_last_update_utc || new Date().toISOString(),
    sumber: "open.er-api.com"
  };
}

async function ambilHistoryEmas() {
  const apiKey = process.env.METAL_API_KEY;

  // contoh: 7 hari terakhir
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];

  const url = `https://api.metalpriceapi.com/v1/timeseries?apikey=${apiKey}&start_date=${startDate}&end_date=${endDate}&base=USD&symbols=XAU`;

  const { data } = await axios.get(url);

  return data.rates; 
}

async function ambilKomoditasFMP(kodeKomoditas) {
  // OPTIONAL: butuh FMP_API_KEY. Jika kosong, akan fallback.
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  // Contoh endpoint FMP commodities: /api/v3/quote/{symbol}
  // Simbol bervariasi. Untuk demo: gunakan "GCUSD" (gold futures) jika tersedia di akun kamu.
  const simbol = kodeKomoditas === "GOLD" ? "GCUSD" : kodeKomoditas;
  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(simbol)}?apikey=${apiKey}`;

  const { data } = await axios.get(url, { timeout: 15000 });
  const item = Array.isArray(data) ? data[0] : null;

  if (!item?.price) return null;
  return {
    nama: item.name || simbol,
    harga: item.price,
    satuan: "USD",
    waktu_update: new Date().toISOString(),
    sumber: "FinancialModelingPrep"
  };
}

async function ambilHargaPermintaan(permintaan) {
  if (permintaan.jenis === "forex") {
    return await ambilKursUSDIDR();
  }

  if (permintaan.jenis === "komoditas" && permintaan.kode === "GOLD") {
    const hasil = await ambilKomoditasFMP("GOLD");
    if (hasil) return hasil;
    return {
      nama: "Emas (demo)",
      harga: null,
      satuan: "USD",
      waktu_update: new Date().toISOString(),
      sumber: "Tidak ada API Key",
      catatan: "Isi FMP_API_KEY agar harga emas tampil dari API."
    };
  }

  if (permintaan.jenis === "kripto") {
    // Demo: gunakan API public coingecko sederhana (tanpa key) — kalau sewaktu-waktu dibatasi, tetap aman untuk tugas.
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
    const { data } = await axios.get(url, { timeout: 15000 });
    const harga = data?.bitcoin?.usd;
    if (!harga) throw new Error("Data BTC tidak tersedia");
    return {
      nama: "BTC/USD",
      harga,
      satuan: "USD",
      waktu_update: new Date().toISOString(),
      sumber: "CoinGecko"
    };
  }

  if (permintaan.jenis === "saham_id") {
    // Placeholder: banyak API saham Indonesia butuh key (mis goapi).
    return {
      nama: `Saham IDX ${permintaan.kode} (demo)`,
      harga: null,
      satuan: "IDR",
      waktu_update: new Date().toISOString(),
      sumber: "Belum dikonfigurasi",
      catatan: "Tambahkan API saham Indonesia (mis goapi) agar harga IDX tampil."
    };
  }

  return { nama: "Tidak diketahui", harga: null, satuan: "-", waktu_update: new Date().toISOString(), sumber: "-" };
}

module.exports = { ambilKursUSDIDR, ambilHargaPermintaan };
