import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.70.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

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
    const { room_id, body, reply_to, image_url } = await req.json();
    if (!room_id || (!body && !image_url)) {
      return new Response(JSON.stringify({ error: "Bad Request: room_id and (body or image_url) required" }), { 
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { 
        global: { 
          headers: { 
            Authorization: req.headers.get("Authorization")! 
          } 
        } 
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 1) Resolve room + verify it's not locked
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, class_id, is_locked")
      .eq("id", room_id)
      .single();

    if (roomError || !room) {
      return new Response(JSON.stringify({ error: "Room not found" }), { 
        status: 404,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    if (room.is_locked) {
      return new Response(JSON.stringify({ error: "Room is locked" }), { 
        status: 403,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 2) Danish profanity filter (catches common Danish curse words)
    const danishProfanity = [
      // Strong curse words
      'fuck', 'fck', 'fucking', 'fucker', 'fuckface',
      'shit', 'skit', 'lort',
      'pis', 'piss',
      'fanden', 'satan', 'helvede',
      'røv', 'røvhul', 'røvbanan',
      'kusse', 'kussekryster', 'fisse', 'fissetryne',
      'pik', 'pikansjos', 'pikhovede', 'pikhoved',
      'luder', 'ludder', 'luderunge',
      'kælling', 'kelling',
      'møgsvin', 'møgluder', 'møgkælling',
      'tåbe', 'idiot', 'spasser', 'mongo', 'retard',
      'bitch', 'bøsse', 'bosse', 'perker',
      // Mild but inappropriate for school
      'lortehovede', 'lortehoved', 'skiderik',
      'fandens', 'pokker', 'søren',
      'kraftedeme', 'kraftedme', 'fandme', 'fanme',
      'hore', 'hor',
      // Variations and creative spellings
      'f*ck', 'sh*t', 'b*tch', 'p*k',
      'fjong', 'nar', 'tåbe', 'tosse',
      // English that kids use
      'asshole', 'bastard', 'dick', 'pussy', 'cunt',
      'jackass', 'dumbass', 'shithead', 'motherfucker'
    ];

    if (body) {
      const lowerBody = body.toLowerCase();
      const foundProfanity = danishProfanity.find(word => {
        // Match whole words or words with punctuation/spaces around them
        const regex = new RegExp(`(^|\\s|[.,!?])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[.,!?])`, 'i');
        return regex.test(lowerBody);
      });

      if (foundProfanity) {
        console.log(`Danish profanity detected: ${foundProfanity}`);
        // Log and block immediately
        await supabase.from("moderation_events").insert({
          subject_type: "message",
          subject_id: "blocked_danish_profanity",
          class_id: room.class_id,
          rule: "danish_profanity_filter",
          status: "hidden",
          labels: [foundProfanity],
          score: 1.0
        });

        return new Response(
          JSON.stringify({ 
            status: "blocked",
            reason: "Din besked indeholder bandeord eller stødende sprog som ikke er tilladt i skolechatten."
          }), 
          { 
            status: 200,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
    }

    // 3) Run OpenAI Moderation (FREE - omni-moderation-latest)
    let moderation;
    let moderationFailed = false;
    
    try {
      // Prepare moderation input - can be text, image URL, or both
      let moderationInput: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
      
      if (image_url && body) {
        // Both image and text
        console.log("Calling OpenAI Moderation API for text + image");
        moderationInput = [
          { type: "text", text: body },
          { type: "image_url", image_url: { url: image_url } }
        ];
      } else if (image_url) {
        // Image only
        console.log("Calling OpenAI Moderation API for image:", image_url);
        moderationInput = [
          { type: "image_url", image_url: { url: image_url } }
        ];
      } else {
        // Text only
        console.log("Calling OpenAI Moderation API for text:", body);
        moderationInput = body;
      }
      
      moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: moderationInput as any
      });
      console.log("Moderation result:", JSON.stringify(moderation.results[0]));
    } catch (error) {
      console.error("Moderation API failed:", error);
      moderationFailed = true;
      // Continue without moderation if API fails (rate limit, etc.)
    }

    const flagged = moderationFailed ? false : (moderation?.results?.[0]?.flagged ?? false);
    let suggested: string | null = null;
    let action: "allow" | "flag" | "block" = "allow";
    
    console.log(`Moderation check: flagged=${flagged}, action=${action}, moderationFailed=${moderationFailed}`);

    // Check scores even if not flagged by OpenAI (stricter school standards)
    if (!moderationFailed && moderation) {
      const categories = moderation.results[0].category_scores ?? {};
      
      // STRICT school-appropriate thresholds
      const hardBlock =
        (categories["sexual/minors"] ?? 0) > 0.3 ||      // Very strict for minors
        (categories["hate/threatening"] ?? 0) > 0.3 ||
        (categories["violence/graphic"] ?? 0) > 0.3 ||
        (categories["sexual"] ?? 0) > 0.5 ||
        (categories["violence"] ?? 0) > 0.5;
        
      // Flag if ANY concerning content (lower thresholds for school)
      const shouldFlag =
        (categories["harassment"] ?? 0) > 0.2 ||        // Flag teasing/bullying
        (categories["hate"] ?? 0) > 0.2 ||
        (categories["illicit"] ?? 0) > 0.2;

      if (hardBlock) {
        action = "block";
      } else if (shouldFlag || flagged) {
        action = "flag";
      }
      
      console.log(`Score check - harassment: ${categories["harassment"]}, hate: ${categories["hate"]}, decision: ${action}`);
    }

    if (flagged || action === "flag" || action === "block") {

      // 3) If soft flag, generate kind suggestion using GPT-4o-mini
      if (action === "flag" && body) {
        // Only generate suggestions for text messages, not image-only
        try {
          console.log("Generating suggestion with GPT-4o-mini...");
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { 
                role: "system", 
                content: "Du er en hjælpsom assistent i en dansk skolechat. Brugeren skrev noget upassende. Hvis beskeden indeholder et egentligt budskab (fx en mening, spørgsmål eller kommentar), skal du omskrive det til at være venligt og respektfuldt, men bevare den samme mening. Hvis beskeden kun er et skældsord, fornærmelse eller spam uden nogen mening, skal du svare med teksten: 'BLOCK' (uden citationstegn). Skriv aldrig generiske advarsler eller lærerhenvendelser - kun omskrivninger af brugerens faktiske budskab eller 'BLOCK'. Skriv på dansk." 
              },
              { role: "user", content: body }
            ],
            max_tokens: 100,
            temperature: 0.7
          });
          suggested = completion.choices[0]?.message?.content ?? null;
          
          // If AI says to block, upgrade to hard block
          if (suggested?.trim() === 'BLOCK') {
            action = "block";
            suggested = null;
          }
          
          console.log("Suggestion generated:", suggested);
        } catch (error) {
          console.error("Error generating suggestion:", error);
          // Continue without suggestion if GPT-4o-mini fails
        }
      }
    }

    // 4) Handle blocked and flagged messages - don't insert, return suggestion
    if (action === "block") {
      // Log moderation event but don't insert message
      if (moderation) {
        await supabase.from("moderation_events").insert({
          subject_type: "message",
          subject_id: "blocked_before_insert",
          class_id: room.class_id,
          rule: "openai:hard_block",
          status: "hidden",
          labels: moderation.results[0].categories ? 
            Object.keys(moderation.results[0].categories).filter(
              k => moderation.results[0].categories[k]
            ) : [],
          score: Math.max(...Object.values(moderation.results[0].category_scores ?? {}).map(v => Number(v) || 0))
        });
      }

      return new Response(
        JSON.stringify({ 
          status: "blocked",
          reason: "Message contains inappropriate content",
          categories: moderation.results[0].categories
        }), 
        { 
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // If flagged (soft), return suggestion without inserting
    if (action === "flag") {
      // Log moderation event
      if (moderation) {
        await supabase.from("moderation_events").insert({
          subject_type: "message",
          subject_id: "flagged_before_insert",
          class_id: room.class_id,
          rule: "openai:soft_flag",
          status: "flagged",
          labels: moderation.results[0].categories ? 
            Object.keys(moderation.results[0].categories).filter(
              k => moderation.results[0].categories[k]
            ) : [],
          score: Math.max(...Object.values(moderation.results[0].category_scores ?? {}).map(v => Number(v) || 0))
        });
      }

      return new Response(
        JSON.stringify({ 
          status: "flag",
          suggested: suggested,
          reason: "Message needs rephrasing"
        }), 
        { 
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // 5) Insert message (RLS policies ensure user has permission)
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        room_id,
        class_id: room.class_id,  // Required for RLS policies
        body: body || null,
        image_url: image_url || null,
        reply_to: reply_to || null,
        user_id: user.id
      })
      .select("id, created_at, body, image_url")
      .single();

    if (messageError) {
      console.error("Error inserting message:", messageError);
      return new Response(
        JSON.stringify({ error: "Failed to create message", details: messageError.message }), 
        { 
          status: 403,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // 6) Return success response (message was allowed)
    return new Response(
      JSON.stringify({ 
        status: "allow",
        message_id: message.id,
        created_at: message.created_at
      }), 
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );

  } catch (err) {
    console.error("Edge function error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Server error: ${errorMessage}` }), 
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
});
