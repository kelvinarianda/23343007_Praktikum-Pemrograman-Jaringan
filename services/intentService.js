function klasifikasiIntent(teks) {
  const t = (teks || "").toLowerCase();

  const kata_kunci_umum = ["apa itu", "jelaskan", "definisi", "mengapa", "bagaimana", "contoh"];
  const kata_kunci_data = ["harga", "berapa", "kurs", "nilai tukar", "emas", "gold", "usd", "idr", "saham", "timah", "minyak", "komoditas", "btc", "bitcoin"];

  if (kata_kunci_umum.some(k => t.includes(k))) return "umum";
  if (kata_kunci_data.some(k => t.includes(k))) return "data_harga";
  return "umum";
}

function ekstrakPermintaan(teks) {
  const t = (teks || "").toLowerCase();

  // Minimal: USD/IDR, Emas, BTC (contoh)
  if (t.includes("usd") && t.includes("idr")) return { jenis: "forex", dari: "USD", ke: "IDR" };
  if (t.includes("emas") || t.includes("gold")) return { jenis: "komoditas", kode: "GOLD" };
  if (t.includes("btc") || t.includes("bitcoin")) return { jenis: "kripto", kode: "BTCUSD" };

  // Saham Indonesia (format: "harga bbri" / "saham tlkm")
  const m = t.match(/\b(bbr[iu]|bbca|tlkm|asii|unvr|bmri|ptba|antm|brms)\b/i);
  if (m) return { jenis: "saham_id", kode: m[1].toUpperCase() };

  return { jenis: "tidak_diketahui" };
}

module.exports = { klasifikasiIntent, ekstrakPermintaan };
