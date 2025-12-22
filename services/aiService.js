const axios = require("axios");
const { konfigurasiAI } = require("../config/ai");

// ✅ AI CALL (pakai router HF yang terbaru)
async function panggilAI(prompt) {
  const { token, model } = konfigurasiAI();

  if (!token || token.includes("ISI_")) {
    return "AI belum dikonfigurasi. Isi HF_TOKEN di file .env.";
  }

  try {
    const url = "https://router.huggingface.co/v1/chat/completions";

const { data } = await axios.post(
  url,
  {
    model,
    messages: [
      {
        role: "system",
        content:
          "Anda adalah asisten edukasi ekonomi. Selalu jawab dalam Bahasa Indonesia yang formal, jelas, dan ringkas. Jangan gunakan Bahasa Inggris. Jangan memberi rekomendasi beli/jual atau prediksi harga.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 256,
  },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const jawaban = data?.choices?.[0]?.message?.content;
    if (!jawaban) return "AI: Respon kosong / format tidak sesuai.";
    return String(jawaban).trim();
  } catch (err) {
    console.error("❌ Error panggil AI:", err?.response?.status, err?.response?.data || err.message);

    const status = err?.response?.status;
    if (status === 401) return "AI: Token tidak valid (401).";
    if (status === 403) return "AI: Akses ditolak (403).";
    if (status === 404) return "AI: Model tidak ditemukan (404). Cek HF_MODEL.";
    if (status === 429) return "AI: Kena limit (429). Coba lagi beberapa saat.";
    if (status === 503) return "AI: Model sedang loading/overload (503). Coba lagi sebentar.";
    return "AI: Gagal terhubung. Cek internet / token / model.";
  }
}

// ✅ PROMPT HELPERS (ini yang tadi missing)
function buatPromptUmum(pertanyaan) {
  return [
    "Anda adalah asisten AI edukasi ekonomi dan investasi.",
    "WAJIB menjawab menggunakan Bahasa Indonesia.",
    "Gunakan bahasa formal, jelas, dan mudah dipahami mahasiswa.",
    "Dilarang menggunakan Bahasa Inggris.",
    "Dilarang memberi saran beli/jual atau prediksi harga.",
    `Pertanyaan: ${pertanyaan}`
  ].join("\n");
}


function buatPromptData(pertanyaan, dataRingkas) {
  return [
    "Anda adalah asisten AI edukasi ekonomi dan investasi.",
    "WAJIB menjawab menggunakan Bahasa Indonesia.",
    "Gunakan bahasa formal, jelas, dan berbasis data.",
    "Dilarang menggunakan Bahasa Inggris.",
    "Dilarang memberi saran beli/jual atau prediksi harga.",
    `Pertanyaan: ${pertanyaan}`,
    `Data: ${JSON.stringify(dataRingkas)}`
  ].join("\n");
}


module.exports = { panggilAI, buatPromptUmum, buatPromptData };
