const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

// One shared layout for every transactional email so they all look the same.
const layout = ({ title, bodyHtml }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; max-width: 600px; margin: 0 auto;">
        <tr><td style="background-color: #7c3aed; padding: 32px 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">MoneyMint</h1>
        </td></tr>
        <tr><td style="padding: 40px;">${bodyHtml}</td></tr>
        <tr><td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 40px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} MoneyMint. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const codeBox = (code) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="padding: 24px 0;">
      <div style="background-color: #f5f3ff; border: 2px dashed #a78bfa; border-radius: 10px; padding: 18px 36px; display: inline-block;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #6d28d9; letter-spacing: 10px;">${code}</span>
      </div>
    </td></tr>
  </table>`;

const paragraph = (text, style = "") =>
  `<p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 16px; ${style}">${text}</p>`;

const signupOtpEmail = (otp, fullName, expirySeconds) => ({
  text: `Your MoneyMint verification code is: ${otp}. This code expires in ${expirySeconds} seconds.`,
  html: layout({
    title: "Verify Your Email",
    bodyHtml: `
      <h2 style="color: #111827; margin: 0 0 16px; font-size: 20px;">Verify Your Email Address</h2>
      ${paragraph(fullName ? `Hi ${escapeHtml(fullName)},` : "Hello,")}
      ${paragraph("Thank you for signing up for MoneyMint! Enter this 6-digit code to complete your registration:")}
      ${codeBox(otp)}
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
        <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 500;">This code expires in ${expirySeconds} seconds.</p>
      </div>
      ${paragraph("If you did not sign up for MoneyMint, you can safely ignore this email.", "font-size: 14px; color: #6b7280;")}`,
  }),
});

const resetPasswordEmail = (otp, expiryMinutes) => ({
  text: `Your MoneyMint password reset code is: ${otp}. It is valid for ${expiryMinutes} minutes. If you did not request this, ignore this email.`,
  html: layout({
    title: "Password Reset",
    bodyHtml: `
      <h2 style="color: #111827; margin: 0 0 16px; font-size: 20px;">Reset Your Password</h2>
      ${paragraph("We received a request to reset your MoneyMint password. Use this one-time code to continue:")}
      ${codeBox(otp)}
      ${paragraph(`This code is valid for ${expiryMinutes} minutes. Please do not share it with anyone.`)}
      ${paragraph("If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.", "font-size: 14px; color: #6b7280;")}`,
  }),
});

module.exports = { signupOtpEmail, resetPasswordEmail };
