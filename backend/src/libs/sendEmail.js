export const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_USER; // Email bạn dùng đăng ký Brevo

  if (!apiKey || !senderEmail) {
    throw new Error("Thieu BREVO_API_KEY hoac EMAIL_USER trong .env");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "MyChat", email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`);
  }

  return await response.json();
};