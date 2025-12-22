const crypto = require("crypto");
const LogChat = require("../models/LogChat");
const { klasifikasiIntent, ekstrakPermintaan } = require("../services/intentService");
const { ambilHargaPermintaan } = require("../services/marketService");
const { panggilAI, buatPromptUmum, buatPromptData } = require("../services/aiService");


function pasangSocketChatbot(io) {
  io.on("connection", (socket) => {
    console.log("✅ Pengguna terhubung ke ChatBot via socket:", socket.id);

    socket.on("pesan_user", async (payload) => {
      try {
        const { id_pengguna, pesan } = payload || {};
        const teks = (pesan || "").trim();

        if (!id_pengguna) {
          socket.emit("jawaban_bot", { jawaban: "Sesi tidak valid. Silakan login ulang." });
          return;
        }
        if (!teks) {
          socket.emit("jawaban_bot", { jawaban: "Pesan tidak boleh kosong." });
          return;
        }

        const chat_id = crypto.randomUUID();
        const intent = klasifikasiIntent(teks);

        let data_ringkas = null;
        let prompt = "";

        if (intent === "data_harga") {
          const permintaan = ekstrakPermintaan(teks);
          data_ringkas = await ambilHargaPermintaan(permintaan);
          prompt = buatPromptData(teks, data_ringkas);
        } else {
          prompt = buatPromptUmum(teks);
        }

        const jawaban = await panggilAI(prompt);

        await LogChat.create({
          id_pengguna,
          chat_id,
          pesan_user: teks,
          jawaban_bot: jawaban,
          intent,
          data_ringkas
        });

        socket.emit("jawaban_bot", {
          jawaban,
          intent,
          data_ringkas,
          waktu: new Date().toISOString()
        });
      } catch (err) {
        console.error("❌ Error proses pesan_user:", err?.response?.status, err?.response?.data || err);
        socket.emit("jawaban_bot", {
          jawaban: "Terjadi kesalahan pada server. Cek terminal untuk detail error.",
        });
      }
    });
  });
}

module.exports = { pasangSocketChatbot };
