const mongoose = require("mongoose");

const PenggunaSchema = new mongoose.Schema(
  {
    nama: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    kata_sandi_hash: { type: String, required: true },
    peran: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pengguna", PenggunaSchema);
