import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface NotificationData {
  queue_id: string;
  child_user_id: string;
  guardian_user_ids: string[];
  flagged_messages: Array<{
    id: string;
    body: string | null;
    image_url: string | null;
    created_at: string;
  }>;
  context_messages: Array<{
    id: string;
    body: string | null;
    image_url: string | null;
    created_at: string;
    user_name: string;
  }>;
  room_name: string;
  class_name: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get pending notifications from queue
    const { data: notifications, error: fetchError } = await supabase
      .rpc('process_parent_notifications');

    if (fetchError) {
      console.error("Error fetching notifications:", fetchError);
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${notifications.length} parent notifications`);

    const results = [];

    for (const notif of notifications as NotificationData[]) {
      try {
        // Get guardian emails
        const { data: guardians, error: guardianError } = await supabase
          .from('profiles')
          .select('id, email, display_name')
          .in('id', notif.guardian_user_ids);

        if (guardianError || !guardians || guardians.length === 0) {
          console.error("No guardians found for child:", notif.child_user_id);
          continue;
        }

        // Get child info
        const { data: child } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', notif.child_user_id)
          .single();

        const childName = child?.display_name || child?.email || 'Dit barn';

        // Build email content
        const flaggedCount = notif.flagged_messages.length;
        const subject = flaggedCount > 1 
          ? `⚠️ ${flaggedCount} beskeder fra ${childName} markeret til gennemgang`
          : `⚠️ Besked fra ${childName} markeret til gennemgang`;

        const contextHtml = notif.context_messages
          .map(msg => `
            <div style="margin: 8px 0; padding: 8px; background: #f5f5f5; border-left: 2px solid #ddd;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                <strong>${msg.user_name}</strong> • ${new Date(msg.created_at).toLocaleString('da-DK')}
              </div>
              <div>${msg.body || '<em>[Billede]</em>'}</div>
            </div>
          `)
          .join('');

        const flaggedHtml = notif.flagged_messages
          .map(msg => `
            <div style="margin: 8px 0; padding: 12px; background: #fff3cd; border-left: 3px solid #ff3fa4;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                ${new Date(msg.created_at).toLocaleString('da-DK')}
              </div>
              <div><strong>${msg.body || '<em>[Billede]</em>'}</strong></div>
            </div>
          `)
          .join('');

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Besked markeret til gennemgang</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: #ff3fa4; color: white; padding: 20px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 24px;">⚠️ Besked markeret til gennemgang</h1>
            </div>

            <div style="padding: 20px; background: white;">
              <p style="font-size: 16px;">Kære forælder,</p>
              
              <p>
                ${flaggedCount > 1 
                  ? `Vi har markeret <strong>${flaggedCount} beskeder</strong> fra ${childName}`
                  : `Vi har markeret en besked fra ${childName}`
                } 
                i skolechatten til gennemgang, da vores automatiske moderation fandt indhold, der kan være upassende.
              </p>

              <h2 style="color: #ff3fa4; font-size: 18px; margin-top: 30px;">Markerede beskeder:</h2>
              ${flaggedHtml}

              ${notif.context_messages.length > 0 ? `
                <h3 style="color: #666; font-size: 16px; margin-top: 30px;">Tidligere samtale (kontekst):</h3>
                ${contextHtml}
              ` : ''}

              <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-left: 3px solid #6b9bd1;">
                <h3 style="margin-top: 0; color: #6b9bd1;">Hvad sker der nu?</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Beskeden er blevet sendt og er synlig i chatten</li>
                  <li>Dit barn har fået besked om, at beskeden blev markeret</li>
                  <li>En lærer vil gennemgå beskeden og følge op hvis nødvendigt</li>
                  <li>Dette er en mulighed for at tale med dit barn om passende kommunikation online</li>
                </ul>
              </div>

              <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong>Klasse:</strong> ${notif.class_name}<br>
                  <strong>Kanal:</strong> #${notif.room_name}
                </p>
              </div>

              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Med venlig hilsen,<br>
                <strong>KlasseChatten</strong>
              </p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; font-size: 12px; color: #999; text-align: center;">
              Dette er en automatisk besked fra KlasseChatten moderationssystem.
            </div>

          </body>
          </html>
        `;

        // Send email to all guardians
        if (RESEND_API_KEY) {
          for (const guardian of guardians) {
            try {
              const emailResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                  from: "KlasseChatten <notifications@klassechatten.dk>",
                  to: [guardian.email],
                  subject: subject,
                  html: emailHtml,
                }),
              });

              if (!emailResponse.ok) {
                console.error(`Failed to send email to ${guardian.email}`);
              } else {
                console.log(`Email sent to ${guardian.email}`);
              }
            } catch (emailError) {
              console.error(`Error sending email to ${guardian.email}:`, emailError);
            }
          }
        }

        // Mark as sent
        await supabase.rpc('mark_notification_sent', { p_queue_id: notif.queue_id });
        
        results.push({
          queue_id: notif.queue_id,
          status: 'sent',
          guardians_notified: guardians.length,
        });

      } catch (error) {
        console.error(`Error processing notification ${notif.queue_id}:`, error);
        results.push({
          queue_id: notif.queue_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: notifications.length,
        results: results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("Edge function error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Server error: ${errorMessage}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
