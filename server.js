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

// Socket
const { pasangSocketChatbot } = require("./sockets/chatbot");

// =======================
// INIT APP & SERVER
// =======================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// =======================
// VIEW ENGINE
// =======================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// =======================
// STATIC FILES
// =======================
app.use(express.static(path.join(__dirname, "public"))); 
// termasuk /uploads/berita

// =======================
// BODY PARSER
// =======================
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
  })
);

// =======================
// API ROUTES
// =======================
app.use("/api/public", publicApiRoutes); // guest + user
app.use("/api/market", marketRoutes);    // (opsional / lama)

// =======================
// WEB ROUTES
// =======================
app.use(publicRoutes);       // "/" homepage guest
app.use(authRoutes);         // /login /register /logout
app.use(dashboardRoutes);    // /dashboard (login)
app.use(adminBeritaRoutes);  // /admin/berita (admin)
app.use(emailRoutes);        // /email (login)

// =======================
// SOCKET
// =======================
pasangSocketChatbot(io);

// =======================
// SEED USER DEMO
// =======================
async function seedPenggunaDemo() {
  const adminEmail = "admin@marketbot.local";
  const userEmail = "user@marketbot.local";

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
    console.log("✅ Seed admin: admin@marketbot.local / admin123");
  }

  if (!adaUser) {
    const hash = await bcrypt.hash("user123", 10);
    await Pengguna.create({
      nama: "User MarketBot",
      email: userEmail,
      kata_sandi_hash: hash,
      peran: "user",
    });
    console.log("✅ Seed user: user@marketbot.local / user123");
  }
}

// =======================
// 404 HANDLER
// =======================
app.use((req, res) => {
  res.status(404).send("Halaman tidak ditemukan (404).");
});

// =======================
// ERROR HANDLER
// =======================
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err);
  res.status(500).send("Terjadi kesalahan pada server.");
});

// =======================
// MAIN
// =======================
async function main() {
  await konekDatabase(process.env.MONGO_URI);
  await seedPenggunaDemo();

  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => {
    console.log(`🚀 Server berjalan di http://localhost:${port}`);
  });
}

main();
