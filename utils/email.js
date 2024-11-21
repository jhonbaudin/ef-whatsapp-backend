import nodemailer from "nodemailer";

export async function sendEmailWithAttachment(
  to,
  attachmentBuffer,
  filename,
  subject,
  text
) {
  let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const attachments =
    attachmentBuffer && filename
      ? [
          {
            filename: filename,
            content: attachmentBuffer,
          },
        ]
      : [];

  let mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    text: text,
    attachments: attachments,
  };

  await transporter.sendMail(mailOptions);
}
