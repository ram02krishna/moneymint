const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    const result = await resend.emails.send({
      from: `MoneyMint <expense_tracker@ram02krishna.me>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    });

    if (result.error) {
      const error = new Error(
        result.error.message || "Resend rejected the email request",
      );
      error.name = result.error.name || "ResendError";
      throw error;
    }

    console.log("Email sent successfully:", result.data);
    return result.data;
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    throw error;
  }
};

module.exports = sendEmail;
