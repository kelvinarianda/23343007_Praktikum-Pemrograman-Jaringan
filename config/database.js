const mongoose = require("mongoose");

async function konekDatabase(uri) {
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB terhubung");
  } catch (err) {
    console.error("❌ Gagal konek MongoDB:", err.message);
    process.exit(1);
  }
}

module.exports = { konekDatabase };
