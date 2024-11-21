import nodemailer from "nodemailer";

export async function sendEmailWithAttachment(to, attachmentBuffer, filename) {
  let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: "Reporte Semanal",
    text: "Adjunto tenemos el reporte semanal",
    attachments: [
      {
        filename: filename,
        content: attachmentBuffer,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}
