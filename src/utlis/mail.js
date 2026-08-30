import nodemailer from "nodemailer";

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

// ── Shared transporter ─────────────────────────────────────────────────────────
const getTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || "rabbi.fajracademy@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

// ── Shared branded HTML email wrapper ──────────────────────────────────────────────────
function getEmailWrapper(contentHtml) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Fajr Academy</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f8;padding:36px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;
                      box-shadow:0 6px 30px rgba(10,25,49,0.10);border:1px solid #dde2ec;">

          <!-- ── Header / Logo ──────────────────────────────────── -->
          <tr>
            <td style="background:linear-gradient(135deg,#0A1931 0%,#1c3f70 100%);
                        padding:30px 40px 24px;text-align:center;">
              <p style="color:#ffffff;font-size:28px;font-weight:800;margin:0;
                         letter-spacing:1px;font-family:Georgia,serif;">Fajr Academy</p>
              <p style="color:#a8bcd4;font-size:11px;margin:10px 0 0;
                         text-transform:uppercase;letter-spacing:2.5px;font-weight:600;">
                Official Communication
              </p>
            </td>
          </tr>

          <!-- ── Body content ───────────────────────────────────── -->
          <tr>
            <td style="padding:38px 44px 30px;color:#1a1a2e;font-size:15px;line-height:1.75;">
              ${contentHtml}
            </td>
          </tr>

          <!-- ── Divider ────────────────────────────────────────── -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e8ecf3;margin:0;" />
            </td>
          </tr>

          <!-- ── Footer ─────────────────────────────────────────── -->
          <tr>
            <td style="background:#f8f9fd;padding:22px 40px 28px;text-align:center;">
              <p style="margin:0 0 8px;">
                <a href="https://www.fajracademy.io/"
                   style="color:#0A1931;font-weight:700;font-size:13px;text-decoration:none;">
                  www.fajracademy.io
                </a>
              </p>
              <p style="margin:0 0 10px;font-size:12px;color:#6b7a99;">
                &#128222;&nbsp;
                <a href="tel:+8801857381244"
                   style="color:#6b7a99;text-decoration:none;">01857-381244</a>
              </p>
              <p style="margin:0;font-size:11px;color:#aab4c8;line-height:1.7;">
                This is an automated email from Fajr Academy ERP.<br />
                Please do not reply directly to this message.<br />
                &copy; ${year} Fajr Academy. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── sendWelcomeEmail ───────────────────────────────────────────────────────────
async function sendWelcomeEmail({ toEmail, fullName }) {
  const transporter = getTransporter();
  const fromEmail = process.env.GMAIL_USER || "rabbi.fajracademy@gmail.com";

  await transporter.sendMail({
    from: `"Fajr Academy" <${fromEmail}>`,
    to: toEmail,
    subject: "Welcome to Fajr Academy ERP — Account Activated",
    html: getEmailWrapper(`
      <h3 style="color:#0A1931;font-size:20px;margin:0 0 16px;">Welcome, ${fullName}! &#127881;</h3>
      <p style="margin:0 0 12px;">Your Fajr Academy ERP account has been successfully created and activated.</p>
      <p style="margin:0 0 20px;"><strong>Registered Email:</strong> ${toEmail}</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${getBaseUrl()}/login"
           style="background:#0A1931;color:#fff;padding:14px 36px;text-decoration:none;
                  border-radius:7px;font-weight:700;font-size:14px;display:inline-block;">
          Log in to Your Dashboard
        </a>
      </div>
      <p style="margin:0 0 8px;color:#555;">You can now access the ERP portal using your email and password.</p>
      <p style="margin:0;color:#555;">If you need any assistance, please contact the administration team.</p>
    `),
  });
}

// ── sendVerifyEmail ────────────────────────────────────────────────────────────
async function sendVerifyEmail({ toEmail, fullName, code }) {
  const transporter = getTransporter();
  const fromEmail = process.env.GMAIL_USER || "rabbi.fajracademy@gmail.com";

  await transporter.sendMail({
    from: `"Fajr Academy" <${fromEmail}>`,
    to: toEmail,
    subject: "Fajr Academy ERP — Email Verification Code",
    html: getEmailWrapper(`
      <h3 style="color:#0A1931;font-size:20px;margin:0 0 16px;">Dear ${fullName},</h3>
      <p style="margin:0 0 12px;">
        Please use the following <strong>4-digit OTP code</strong> to verify your Fajr Academy ERP account:
      </p>
      <div style="text-align:center;margin:28px 0;">
        <div style="font-size:40px;font-weight:700;color:#3b4fcf;background:#eef0fc;
                    padding:20px 44px;display:inline-block;border-radius:12px;
                    letter-spacing:12px;border:2px solid #d0d5f5;">
          ${code}
        </div>
      </div>
      <p style="margin:0 0 12px;color:#555;">
        This code is valid for <strong>15 minutes</strong>. Do not share it with anyone.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${getBaseUrl()}/verify?email=${encodeURIComponent(toEmail)}"
           style="background:#0A1931;color:#fff;padding:14px 36px;text-decoration:none;
                  border-radius:7px;font-weight:700;font-size:14px;display:inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="font-size:13px;color:#999;margin:0;">
        If you did not request this, you can safely ignore this email.
      </p>
    `),
  });
}

// ── sendCustomEmail ────────────────────────────────────────────────────────────
async function sendCustomEmail({ toEmail, subject, htmlBody }) {
  const transporter = getTransporter();
  const fromEmail = process.env.GMAIL_USER || "rabbi.fajracademy@gmail.com";

  await transporter.sendMail({
    from: `"Fajr Academy" <${fromEmail}>`,
    to: toEmail,
    subject: subject,
    html: getEmailWrapper(htmlBody),
  });
}

export { sendWelcomeEmail, sendVerifyEmail, sendCustomEmail };
