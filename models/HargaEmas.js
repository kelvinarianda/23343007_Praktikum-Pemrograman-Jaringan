const mongoose = require("mongoose");

const HargaEmasSchema = new mongoose.Schema(
  {
    tanggal: { type: String, required: true, unique: true }, // YYYY-MM-DD
    harga_usd_per_oz: { type: Number, required: true },
    sumber: { type: String, default: "metalpriceapi.com" },
    raw: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HargaEmas", HargaEmasSchema);
