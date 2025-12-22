const express = require("express");
const LogChat = require("../models/LogChat");
const { buatTransporterEmail } = require("../config/email");

const router = express.Router();

function wajibLogin(req, res, next) {
  if (!req.session?.pengguna) return res.status(401).json({ ok: false, pesan: "Belum login" });
  next();
}

router.post("/email/ringkasan", wajibLogin, async (req, res) => {
  const transporter = buatTransporterEmail();
  if (!transporter) return res.status(400).json({ ok: false, pesan: "Email belum dikonfigurasi (cek .env)" });

  const id_pengguna = req.session.pengguna.id;
  const emailTujuan = req.session.pengguna.email;

  const hariIni = new Date();
  hariIni.setHours(0,0,0,0);

  const logs = await LogChat.find({ id_pengguna, waktu: { $gte: hariIni } })
    .sort({ waktu: -1 })
    .limit(15)
    .lean();

  const isi = [
    `Halo ${req.session.pengguna.nama},`,
    "",
    "Berikut ringkasan chat MarketBot (hari ini):",
    "",
    ...logs.map((l, i) => `${i+1}. Q: ${l.pesan_user}\n   A: ${l.jawaban_bot}\n   Waktu: ${new Date(l.waktu).toLocaleString("id-ID")}\n`),
    "",
    "Catatan: Informasi ini bersifat edukatif, bukan saran investasi."
  ].join("\n");

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: emailTujuan,
      subject: "Ringkasan MarketBot Hari Ini",
      text: isi
    });
    return res.json({ ok: true, pesan: "Email ringkasan berhasil dikirim." });
  } catch (err) {
    return res.status(500).json({ ok: false, pesan: "Gagal kirim email." });
  }
});

module.exports = router;
