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
    const { room_id, body, reply_to, image_url, check_only, force_send } = await req.json();
    if (!room_id || (!body && !image_url)) {
      return new Response(JSON.stringify({ error: "Bad Request: room_id and (body or image_url) required" }), { 
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Create Supabase client with user's auth token for auth
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

    // Create service role client for bypassing RLS when needed
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

    // 1) Resolve room + verify it's not locked + get class moderation settings
    // Use admin client to bypass RLS for reading room/class data
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select(`
        id, 
        class_id, 
        is_locked,
        classes!inner(moderation_level, profanity_filter_enabled)
      `)
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

    // Get moderation settings from class
    const moderationLevel = (room as any).classes?.moderation_level || 'moderate';
    const profanityFilterEnabled = (room as any).classes?.profanity_filter_enabled ?? true;
    console.log(`Class moderation level: ${moderationLevel}, profanity filter: ${profanityFilterEnabled}`);

    // 2) Danish profanity filter (optional - only if enabled for this class)
    let danishProfanityDetected = false;
    let detectedProfanity: string | null = null;
    
    if (profanityFilterEnabled && body) {
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

      const lowerBody = body.toLowerCase();
      const foundProfanity = danishProfanity.find(word => {
        // Match whole words or words with punctuation/spaces around them
        const regex = new RegExp(`(^|\\s|[.,!?])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[.,!?])`, 'i');
        return regex.test(lowerBody);
      });

      if (foundProfanity) {
        console.log(`Danish profanity detected: ${foundProfanity}`);
        danishProfanityDetected = true;
        detectedProfanity = foundProfanity;
        // Will flag the message below, not block
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
    let action: "allow" | "flag" = "allow";  // Removed "block" - we only flag now
    let flagReason: string | null = null;
    
    // Flag immediately if Danish profanity was detected
    if (danishProfanityDetected) {
      action = "flag";
      flagReason = 'high_severity'; // Danish profanity is considered high severity
      console.log(`Flagging due to Danish profanity: ${detectedProfanity}`);
    }
    
    console.log(`Moderation check: flagged=${flagged}, action=${action}, moderationFailed=${moderationFailed}, danishProfanity=${danishProfanityDetected}`);

    // Check scores even if not flagged by OpenAI (stricter school standards)
    if (!moderationFailed && moderation) {
      const categories = moderation.results[0].category_scores ?? {};
      
      // Log all scores for debugging
      console.log(`Category scores:`, JSON.stringify(categories));
      
      // Dynamic thresholds based on class moderation level
      let hardBlockThresholds = { sexual_minors: 0.5, hate_threatening: 0.5, violence_graphic: 0.5, sexual: 0.7, violence: 0.7 };
      let flagThresholds = { harassment: 0.5, hate: 0.5, illicit: 0.5 };
      
      if (moderationLevel === 'strict') {
        // Strict: Lower thresholds, blocks more content
        hardBlockThresholds = { sexual_minors: 0.3, hate_threatening: 0.3, violence_graphic: 0.3, sexual: 0.5, violence: 0.5 };
        flagThresholds = { harassment: 0.3, hate: 0.3, illicit: 0.3 };
        console.log('Using STRICT moderation thresholds');
      } else if (moderationLevel === 'relaxed') {
        // Relaxed: Higher thresholds, allows more content
        hardBlockThresholds = { sexual_minors: 0.7, hate_threatening: 0.7, violence_graphic: 0.7, sexual: 0.9, violence: 0.9 };
        flagThresholds = { harassment: 0.7, hate: 0.7, illicit: 0.7 };
        console.log('Using RELAXED moderation thresholds');
      } else {
        // Moderate (default): Balanced thresholds
        console.log('Using MODERATE moderation thresholds');
      }
      
      // Flag if ANY concerning content (we no longer block, only flag)
      const shouldFlag =
        (categories["sexual/minors"] ?? 0) > hardBlockThresholds.sexual_minors ||
        (categories["hate/threatening"] ?? 0) > hardBlockThresholds.hate_threatening ||
        (categories["violence/graphic"] ?? 0) > hardBlockThresholds.violence_graphic ||
        (categories["sexual"] ?? 0) > hardBlockThresholds.sexual ||
        (categories["violence"] ?? 0) > hardBlockThresholds.violence ||
        (categories["harassment"] ?? 0) > flagThresholds.harassment ||
        (categories["hate"] ?? 0) > flagThresholds.hate ||
        (categories["illicit"] ?? 0) > flagThresholds.illicit;

      if (shouldFlag || flagged) {
        action = "flag";
        // Determine severity for notification
        const highSeverity = 
          (categories["sexual/minors"] ?? 0) > hardBlockThresholds.sexual_minors ||
          (categories["hate/threatening"] ?? 0) > hardBlockThresholds.hate_threatening ||
          (categories["violence/graphic"] ?? 0) > hardBlockThresholds.violence_graphic;
        flagReason = highSeverity ? 'high_severity' : 'moderate_severity';
      }
      
      console.log(`Score check - harassment: ${categories["harassment"]}, hate: ${categories["hate"]}, illicit: ${categories["illicit"]}, decision: ${action}`);
    }

    if (flagged || action === "flag") {

      // 3) If flagged, generate kind suggestion using GPT-4o-mini
      if (action === "flag" && body) {
        // Only generate suggestions for text messages, not image-only
        try {
          console.log("Generating suggestion with GPT-4o-mini...");
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { 
                role: "system", 
                content: "Du er en hjælpsom assistent i en dansk skolechat. Brugeren skrev noget stødende. Din opgave er at omforme budskabet til noget konstruktivt og venligt. Hvis beskeden udtrykker vrede eller frustration, omform den til at udtrykke følelser uden at være nedladende (fx 'Jeg er ked af det' eller 'Jeg synes ikke det er fedt'). Hvis beskeden er et personangreb, omform den til en 'jeg-besked' om egne følelser. Hold dig kort og brug dansk ungdomssprog. Eksempler: 'du er dum' → 'jeg er uenig', 'fuck dig' → 'jeg er irriteret'. Hvis du IKKE kan finde en meningsfuld måde at omforme beskeden på, skriv da kun ordet: NONE" 
              },
              { role: "user", content: body }
            ],
            max_tokens: 80,
            temperature: 0.5
          });
          const rawSuggestion = completion.choices[0]?.message?.content ?? null;
          // Filter out BLOCK/NONE responses - treat as no suggestion
          if (rawSuggestion && rawSuggestion.trim().toUpperCase() !== 'BLOCK' && rawSuggestion.trim().toUpperCase() !== 'NONE') {
            suggested = rawSuggestion;
          }
          console.log("Suggestion generated:", suggested);
        } catch (error) {
          console.error("Error generating suggestion:", error);
          // Continue without suggestion if GPT-4o-mini fails
        }
      }
      
      // If check_only mode, return the flag warning without inserting
      if (check_only && !force_send) {
        return new Response(
          JSON.stringify({ 
            status: "requires_confirmation",
            flagged: true,
            warning: "Din besked indeholder muligt upassende indhold. Den vil blive sendt, men markeret til gennemgang af en voksen.",
            suggested: suggested,
            original_message: body
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

    // 4) Insert ALL messages (flagged or not)
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        room_id,
        class_id: room.class_id,  // Required for RLS policies
        body: body || null,
        image_url: image_url || null,
        reply_to: reply_to || null,
        user_id: user.id,
        is_flagged: action === "flag"  // Mark flagged messages
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

    // 5) Log moderation event for flagged messages and trigger parent notification
    if (action === "flag") {
      let labels: string[] = [];
      let score = 0;
      let rule = "";
      
      if (danishProfanityDetected && detectedProfanity) {
        // Danish profanity detected
        rule = "danish_profanity_filter";
        labels = [detectedProfanity];
        score = 1.0;
      } else if (moderation) {
        // OpenAI moderation flagged
        rule = "openai:flag";
        labels = moderation.results[0].categories ? 
          Object.keys(moderation.results[0].categories).filter(
            k => moderation.results[0].categories[k]
          ) : [];
        score = Math.max(...Object.values(moderation.results[0].category_scores ?? {}).map(v => Number(v) || 0));
      }
      
      const moderationEvent = await supabase.from("moderation_events").insert({
        subject_type: "message",
        subject_id: message.id,
        class_id: room.class_id,
        rule: rule,
        status: "flagged",
        severity: flagReason || 'moderate_severity',
        labels: labels,
        score: score
      }).select().single();

      // Trigger parent notification (database trigger will handle batching)
      console.log('Flagged message inserted, parent notification will be triggered by database');
    }

    // 6) Return success response with flag warning
    return new Response(
      JSON.stringify({ 
        status: action === "flag" ? "flagged" : "allow",
        message_id: message.id,
        created_at: message.created_at,
        flagged: action === "flag",
        warning: action === "flag" ? "Din besked blev sendt, men markeret til gennemgang på grund af muligt upassende indhold." : undefined,
        suggested: action === "flag" ? suggested : undefined
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
