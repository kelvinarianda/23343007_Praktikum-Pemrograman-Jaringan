require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { Server } = require("socket.io");

const { konekDatabase } = require("./config/database");
const Pengguna = require("./models/Pengguna");

// =======================
// ROUTES
// =======================
const publicRoutes = require("./routes/public");
const publicApiRoutes = require("./routes/publicApi");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const emailRoutes = require("./routes/email");
const marketRoutes = require("./routes/marketRoutes");
const adminBeritaRoutes = require("./routes/adminBerita");

const { pasangSocketChatbot } = require("./sockets/chatbot");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  addTrailingSlash: false,
  cors: { origin: "*" }
});

// =======================
// VIEW ENGINE & STATIC
// =======================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =======================
// SESSION
// =======================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "rahasia",
    resave: false,
    saveUninitialized: false,
    // Tambahan untuk kestabilan di serverless
    cookie: { secure: process.env.NODE_ENV === "production" }
  })
);

// =======================
// KONEKSI DATABASE (DI LUAR MAIN)
// =======================
// Vercel sering melakukan 'cold start', jadi kita panggil koneksi di sini
konekDatabase(process.env.MONGO_URI).then(() => {
    console.log("🗄️ Database Terhubung");
    seedPenggunaDemo(); // Jalankan seed jika perlu
}).catch(err => console.error("❌ Gagal konek DB:", err));

// =======================
// API & WEB ROUTES
// =======================
app.use("/api/public", publicApiRoutes);
app.use("/api/market", marketRoutes);
app.use(publicRoutes);
app.use(authRoutes);
app.use(dashboardRoutes);
app.use(adminBeritaRoutes);
app.use(emailRoutes);

pasangSocketChatbot(io);

// =======================
// SEED USER DEMO
// =======================
async function seedPenggunaDemo() {
  const adminEmail = "admin@marketbot.local";
  const userEmail = "user@marketbot.local";

  try {
    const [adaAdmin, adaUser] = await Promise.all([
      Pengguna.findOne({ email: adminEmail }),
      Pengguna.findOne({ email: userEmail }),
    ]);

    if (!adaAdmin) {
      const hash = await bcrypt.hash("admin123", 10);
      await Pengguna.create({
        nama: "Admin MarketBot",
        email: adminEmail,
        kata_sandi_hash: hash,
        peran: "admin",
      });
    }

    if (!adaUser) {
      const hash = await bcrypt.hash("user123", 10);
      await Pengguna.create({
        nama: "User MarketBot",
        email: userEmail,
        kata_sandi_hash: hash,
        peran: "user",
      });
    }
  } catch (e) {
    console.log("Seed skipped or error.");
  }
}

app.use((req, res) => {
  res.status(404).send("Halaman tidak ditemukan (404).");
});

app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err);
  res.status(500).send("Terjadi kesalahan pada server.");
});

// =======================
// EKSPOR APP UNTUK VERCEL
// =======================
// PENTING: Jangan gunakan server.listen() jika di lingkungan Vercel
if (process.env.NODE_ENV !== 'production') {
    const port = Number(process.env.PORT || 3000);
    server.listen(port, () => {
      console.log(`🚀 Local Server berjalan di http://localhost:${port}`);
    });
}

// Baris ini adalah kunci agar Vercel bisa menjalankan Express Anda
module.exports = app;