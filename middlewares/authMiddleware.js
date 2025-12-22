function wajibLogin(req, res, next) {
  if (!req.session || !req.session.pengguna) return res.redirect("/login");
  next();
}

function wajibAdmin(req, res, next) {
  if (!req.session || !req.session.pengguna) return res.redirect("/login");
  if (req.session.pengguna.peran !== "admin") return res.status(403).send("Akses ditolak (admin only).");
  next();
}

module.exports = { wajibLogin, wajibAdmin };
