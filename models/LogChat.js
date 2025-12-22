const mongoose = require("mongoose");

const SkemaLogChat = new mongoose.Schema({
  id_pengguna: { type: mongoose.Schema.Types.ObjectId, ref: "Pengguna", required: true },
  chat_id: { type: String, required: true },
  pesan_user: { type: String, required: true },
  jawaban_bot: { type: String, required: true },
  intent: { type: String, enum: ["data_harga", "umum"], required: true },
  data_ringkas: { type: Object, default: null },
  waktu: { type: Date, default: Date.now }
});

module.exports = mongoose.model("LogChat", SkemaLogChat);
