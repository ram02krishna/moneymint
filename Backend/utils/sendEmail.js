const { Resend } = require("resend");

let client;
// Created on first use so the server can still start (and serve everything except email) without a key.
const getClient = () => {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
};

const FROM = process.env.EMAIL_FROM || "MoneyMint <expense_tracker@ram02krishna.me>";

const sendEmail = async ({ email, subject, message, html }) => {
  // The Resend SDK reports failures in the result instead of throwing, so check it explicitly.
  const { data, error } = await getClient().emails.send({ from: FROM, to: email, subject, text: message, html });
  if (error) throw new Error(error.message || "Email provider rejected the message");
  return data;
};

module.exports = sendEmail;
