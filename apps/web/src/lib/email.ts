import { Resend } from 'resend';

// Initialize Resend with API key or empty string for build time
const resend = new Resend(process.env.RESEND_API_KEY || '');

export interface SendGuardianInviteParams {
  toEmail: string;
  childName: string;
  inviterName: string;
  inviteToken: string;
}

export async function sendGuardianInvite({
  toEmail,
  childName,
  inviterName,
  inviteToken,
}: SendGuardianInviteParams) {
  // Check if API key is configured at runtime
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite?token=${inviteToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'KlasseChatten <onboarding@resend.dev>',
      to: [toEmail],
      subject: `Du er blevet inviteret til at se ${childName}s chat`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 2px solid rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0; border-bottom: 2px solid rgba(0, 0, 0, 0.1);">
              <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; color: #1f2937;">
                KlasseChatten
              </h1>
              <div style="width: 80px; height: 4px; background-color: #ff3fa4; margin-bottom: 32px;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; color: #1f2937;">
                Du er blevet inviteret
              </h2>
              
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #4b5563;">
                <strong>${inviterName}</strong> har inviteret dig til at tilknytte dig som forælder/værge til <strong>${childName}</strong> på KlasseChatten.
              </p>

              <p style="margin: 0 0 32px; font-size: 14px; line-height: 1.6; color: #4b5563;">
                Når du accepterer invitationen, får du adgang til at se ${childName}s beskeder og klassechats.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 48px; background-color: #1f2937; color: #ffffff; text-decoration: none; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 14px; border: 2px solid #1f2937;">
                      Acceptér invitation
                    </a>
                  </td>
                </tr>
              </table>

              <div style="padding: 24px; background-color: rgba(255, 63, 164, 0.1); border: 2px solid rgba(255, 63, 164, 0.2);">
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #4b5563;">
                  <strong style="color: #1f2937;">Vigtigt:</strong> Denne invitation er personlig og kan kun bruges én gang. Linket udløber om 7 dage.
                </p>
              </div>

              <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.6; color: #6b7280;">
                Hvis du har problemer med at klikke på knappen, kan du kopiere dette link:<br>
                <a href="${inviteUrl}" style="color: #ff3fa4; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 2px solid rgba(0, 0, 0, 0.1); background-color: #f9fafb;">
              <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
                KlasseChatten - Sikker skolechat med AI-moderation
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

    if (error) {
      console.error('[Email] Error sending guardian invite:', error);
      throw new Error(`Failed to send invite email: ${error.message}`);
    }

    console.log('[Email] Guardian invite sent successfully:', { toEmail, emailId: data?.id });
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('[Email] Failed to send guardian invite:', error);
    throw error;
  }
}
