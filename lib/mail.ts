import { resend, FROM_EMAIL } from "@/lib/resend";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: "Verify your email — Chatify",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:#f3f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;padding:48px 40px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <div style="width:56px;height:56px;background:#1e9a80;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;">
                      <img src="${BASE_URL}/logo.svg" alt="Chatify" width="56" height="56" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <h1 style="margin:0;font-size:22px;font-weight:600;color:#1c1c1c;letter-spacing:-0.3px;">Verify your email</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="margin:0;font-size:14px;color:#8b8b8b;line-height:22px;">
                      Click the button below to verify your email address and start chatting.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:#1e9a80;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:-0.2px;">
                      Verify email address
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <p style="margin:0;font-size:12px;color:#8b8b8b;line-height:18px;">
                      This link expires in 1 hour. If you didn't create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top:1px solid #e8e5df;padding-top:24px;">
                    <p style="margin:0;font-size:11px;color:#8b8b8b;">
                      Can't click the button? Copy this link:<br/>
                      <a href="${verifyUrl}" style="color:#1e9a80;word-break:break-all;">${verifyUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: "Reset your password — Chatify",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:#f3f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;padding:48px 40px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <div style="width:56px;height:56px;background:#1e9a80;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;">
                      <img src="${BASE_URL}/logo.svg" alt="Chatify" width="56" height="56" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <h1 style="margin:0;font-size:22px;font-weight:600;color:#1c1c1c;letter-spacing:-0.3px;">Reset your password</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="margin:0;font-size:14px;color:#8b8b8b;line-height:22px;">
                      We received a request to reset your password. Click the button below to choose a new one.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#1e9a80;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:-0.2px;">
                      Reset password
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <p style="margin:0;font-size:12px;color:#8b8b8b;line-height:18px;">
                      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top:1px solid #e8e5df;padding-top:24px;">
                    <p style="margin:0;font-size:11px;color:#8b8b8b;">
                      Can't click the button? Copy this link:<br/>
                      <a href="${resetUrl}" style="color:#1e9a80;word-break:break-all;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
