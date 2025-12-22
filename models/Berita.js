const mongoose = require("mongoose");

const BeritaSchema = new mongoose.Schema(
  {
    judul: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },

    ringkasan: { type: String, default: "", trim: true },
    isi: { type: String, required: true },

    status: { type: String, enum: ["draft", "publish"], default: "publish" },

    // path file di public (contoh: /uploads/berita/berita_123.jpg)
    gambar: { type: String, required: true },

    dibuat_oleh: { type: String, default: "admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Berita", BeritaSchema);
