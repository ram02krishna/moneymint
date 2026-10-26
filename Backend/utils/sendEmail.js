const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    const data = await resend.emails.send({
      from: `MoneyMint <expense_tracker@ram02krishna.me>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    });
    
    console.log("Email sent successfully:", data);
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    throw error;
  }
};

module.exports = sendEmail;
