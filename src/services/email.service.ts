import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) {
  console.warn(
    "⚠️  RESEND_API_KEY is not set. Email functionality will not work."
  );
}

/**
 * Send password setup email to user
 */
export async function sendPasswordSetupEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const passwordSetupUrl = `${frontendUrl}/setup-password?token=${token}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Set Up Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h1 style="color: #2c3e50; margin-top: 0;">Welcome, ${name}!</h1>
          
          <p>Your account has been verified by an administrator. You can now set up your password to complete your registration.</p>
          
          <p>Click the button below to set up your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${passwordSetupUrl} target="_blank" rel="noopener noreferrer" 
              style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Set Up Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #999; word-break: break-all;">${passwordSetupUrl}</p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>Note:</strong> This link will expire in 24 hours. If you didn't request this email, please ignore it.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; margin: 0;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </body>
    </html>
  `;

  const emailText = `
Welcome, ${name}!

Your account has been verified by an administrator. You can now set up your password to complete your registration.

Click the link below to set up your password:
${passwordSetupUrl}

Note: This link will expire in 24 hours. If you didn't request this email, please ignore it.

This is an automated email. Please do not reply to this message.
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: ["dev@resend.dev"], //email,
      subject: "Set Up Your Password",
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("Password setup email sent successfully:", data);
  } catch (error: any) {
    console.error("Error sending password setup email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const passwordResetUrl = `${frontendUrl}/reset-password?token=${token}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h1 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h1>
          
          <p>Hello ${name},</p>
          
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${passwordResetUrl}" 
              style="display: inline-block; background-color: #dc3545; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #999; word-break: break-all;">${passwordResetUrl}</p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>Note:</strong> This link will expire in 1 hour. For security reasons, please reset your password as soon as possible.
          </p>
          
          <p style="font-size: 14px; color: #666;">
            If you didn't request a password reset, please contact support immediately.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; margin: 0;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </body>
    </html>
  `;

  const emailText = `
Password Reset Request

Hello ${name},

We received a request to reset your password. If you didn't make this request, you can safely ignore this email.

Click the link below to reset your password:
${passwordResetUrl}

Note: This link will expire in 1 hour. For security reasons, please reset your password as soon as possible.

If you didn't request a password reset, please contact support immediately.

This is an automated email. Please do not reply to this message.
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: email,
      subject: "Reset Your Password",
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("Password reset email sent successfully:", data);
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
