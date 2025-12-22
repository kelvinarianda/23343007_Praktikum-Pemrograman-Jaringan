const nodemailer = require("nodemailer");

function buatTransporterEmail() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
}

module.exports = { buatTransporterEmail };
