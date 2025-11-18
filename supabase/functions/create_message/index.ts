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

    // 1.5) Apply Danish profanity filter (if enabled) - replaces words with asterisks
    let filteredBody = body;
    if (profanityFilterEnabled && body) {
      // Comprehensive list of Danish curse words and creative spellings
      const danishProfanity = [
        // Base words
        'lort', 'pis', 'fanden', 'helvede', 'satan', 'skide', 'pisse',
        'fisse', 'kusse', 'møg', 'sgu', 'fuck', 'shit', 'bitch',
        'røv', 'røvhul', 'pikk', 'pik', 'tissemand', 'nederen', 'idiot',
        'spasser', 'mongo', 'tåbe', 'fjols', 'svin', 'kælling', 'luder',
        'nar', 'dumme', 'åndssvag', 'taber', 'nørd', 'perker', 'neger',
        
        // Compound words and variations
        'lorte', 'pisse', 'fucking', 'shitty', 'pisser', 'fandme',
        'helvedes', 'skide', 'møgsvin', 'røvbanan', 'pikansjos',
        'kraftedeme', 'kraftedme', 'fandens', 'satans', 'djævelen',
        'møgso', 'kusse', 'fissetryne', 'pikhoveder', 'pikansjos',
        
        // Creative spellings (1337 speak, typos, etc)
        'l0rt', 'p1s', 'f1sse', 'kuss3', 'røvv', 'pikke', 'pikkk',
        'fuckk', 'fucck', 'shitt', 'shiit', 'b1tch', 'bitchh',
        'sgu\'', 'sguu', 'pisse', 'skid3', 'skiiide', 'møøg',
        'fandennn', 'helveeede', 'sataan', 'røvhøl', 'røvvhul',
        'spazz', 'mongol', 'mongoo', 'idiott', 'idiooot',
        'tåber', 'tåååbe', 'sviiin', 'svinne', 'kællingg',
        'ludder', 'luuder', 'narre', 'dumm', 'duuumme',
        'åndsvag', 'taaber', 'nørrd', 'perkerr', 'negger',
        
        // Letter substitutions
        'ph1s', 'sk1d3', 'f4nd3n', 'h3lv3d3', 's4t4n',
        'røøv', 'røww', 'p!kk', 'p1kk', 't!ssemand',
        'sp@sser', 'm0ng0', 't@be', 'fj0ls', 'k@lling',
        'lud3r', 'n@r', 'dumm3', '@ndssvag', 't@ber',
      ];

      // Create regex pattern - match whole words with word boundaries
      // Handle words with spaces/special chars separately from regular words
      const pattern = danishProfanity
        .map(word => {
          // For words with spaces or underscores already in them, match as-is
          if (word.includes(' ') || word.includes('_')) {
            // Escape special regex characters but keep spaces/underscores
            return '\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b';
          }
          
          // For regular words, allow optional spaces/underscores between each character
          // Split into characters, escape each, then join with optional separators
          const chars = word.split('').map(char => {
            // Escape special regex characters
            if (/[.*+?^${}()|[\]\\]/.test(char)) {
              return '\\' + char;
            }
            return char;
          });
          
          // Join characters with optional space/underscore pattern
          const withSpaces = chars.join('[\\s_]*');
          return `\\b${withSpaces}\\b`;
        })
        .join('|');
      
      const profanityRegex = new RegExp(pattern, 'gi');
      
      // Replace profanity with asterisks, preserving length
      filteredBody = body.replace(profanityRegex, (match: string) => {
        // Remove spaces and underscores to get actual length
        const cleanLength = match.replace(/[\s_]/g, '').length;
        return '*'.repeat(Math.max(3, cleanLength));
      });
      
      if (filteredBody !== body) {
        console.log(`Profanity filter: Replaced ${body.length - filteredBody.length} characters`);
        console.log(`Original length: ${body.length}, Filtered length: ${filteredBody.length}`);
      }
    }

    // 2) Run OpenAI Moderation (FREE - omni-moderation-latest)
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
    let action: "allow" | "flag" = "allow";  // Removed "block" - we only flag now
    let flagReason: string | null = null;
    
    console.log(`Moderation check: flagged=${flagged}, action=${action}, moderationFailed=${moderationFailed}`);

    // Check scores even if not flagged by OpenAI (stricter school standards)
    if (!moderationFailed && moderation) {
      const categories = moderation.results[0].category_scores ?? {};
      
      // Log all scores for debugging
      console.log(`Category scores:`, JSON.stringify(categories));
      
      // Dynamic thresholds based on class moderation level
      // Note: Death threats fall under "hate/threatening" category
      let criticalThresholds = { sexual_minors: 0.3, hate_threatening: 0.3, violence_graphic: 0.5 };
      let highSeverityThresholds = { sexual: 0.6, violence: 0.6, harassment_threatening: 0.5 };
      let flagThresholds = { harassment: 0.5, hate: 0.5, illicit: 0.5, self_harm: 0.4 };
      
      if (moderationLevel === 'strict') {
        // Strict: Lower thresholds, blocks more content
        criticalThresholds = { sexual_minors: 0.2, hate_threatening: 0.2, violence_graphic: 0.3 };
        highSeverityThresholds = { sexual: 0.4, violence: 0.4, harassment_threatening: 0.3 };
        flagThresholds = { harassment: 0.3, hate: 0.3, illicit: 0.3, self_harm: 0.3 };
        console.log('Using STRICT moderation thresholds');
      } else if (moderationLevel === 'relaxed') {
        // Relaxed: Higher thresholds, allows more content
        criticalThresholds = { sexual_minors: 0.5, hate_threatening: 0.5, violence_graphic: 0.7 };
        highSeverityThresholds = { sexual: 0.8, violence: 0.8, harassment_threatening: 0.7 };
        flagThresholds = { harassment: 0.7, hate: 0.7, illicit: 0.7, self_harm: 0.6 };
        console.log('Using RELAXED moderation thresholds');
      } else {
        // Moderate (default): Balanced thresholds
        // Death threats should trigger at 0.3 for hate/threatening (critical)
        console.log('Using MODERATE moderation thresholds');
      }
      
      // Flag if ANY concerning content (we no longer block, only flag)
      const shouldFlag =
        (categories["sexual/minors"] ?? 0) > criticalThresholds.sexual_minors ||
        (categories["hate/threatening"] ?? 0) > criticalThresholds.hate_threatening ||
        (categories["violence/graphic"] ?? 0) > criticalThresholds.violence_graphic ||
        (categories["sexual"] ?? 0) > highSeverityThresholds.sexual ||
        (categories["violence"] ?? 0) > highSeverityThresholds.violence ||
        (categories["harassment/threatening"] ?? 0) > highSeverityThresholds.harassment_threatening ||
        (categories["harassment"] ?? 0) > flagThresholds.harassment ||
        (categories["hate"] ?? 0) > flagThresholds.hate ||
        (categories["illicit"] ?? 0) > flagThresholds.illicit ||
        (categories["self-harm"] ?? 0) > flagThresholds.self_harm;

      if (shouldFlag || flagged) {
        action = "flag";
        // Determine severity for notification
        // CRITICAL: Death threats, sexual/minors, graphic violence
        const criticalSeverity = 
          (categories["sexual/minors"] ?? 0) > criticalThresholds.sexual_minors ||
          (categories["hate/threatening"] ?? 0) > criticalThresholds.hate_threatening ||
          (categories["violence/graphic"] ?? 0) > criticalThresholds.violence_graphic;
        
        // HIGH: Severe violence, sexual content, threatening harassment, self-harm
        const highSeverity = 
          !criticalSeverity && (
            (categories["sexual"] ?? 0) > highSeverityThresholds.sexual ||
            (categories["violence"] ?? 0) > highSeverityThresholds.violence ||
            (categories["harassment/threatening"] ?? 0) > highSeverityThresholds.harassment_threatening ||
            (categories["self-harm"] ?? 0) > (flagThresholds.self_harm + 0.2)
          );
        
        // Determine final severity
        if (criticalSeverity) {
          flagReason = 'high_severity';
          console.log('CRITICAL SEVERITY: Death threats, sexual/minors, or graphic violence detected');
        } else if (highSeverity) {
          flagReason = 'high_severity';
          console.log('HIGH SEVERITY: Severe violence, sexual content, or threatening behavior detected');
        } else {
          flagReason = 'moderate_severity';
          console.log('MODERATE SEVERITY: General harassment, hate speech, or illicit content detected');
        }
      }
      
      console.log(`Score check - harassment: ${categories["harassment"]}, hate: ${categories["hate"]}, illicit: ${categories["illicit"]}, decision: ${action}`);
    }

    // 4) Insert ALL messages immediately (flagged or not)
    // Use filteredBody if profanity filter was applied
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        room_id,
        class_id: room.class_id,  // Required for RLS policies
        body: filteredBody || null,  // Use filtered body with replaced profanity
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
      let rule = "openai:flag";
      
      if (moderation) {
        // OpenAI moderation flagged
        labels = moderation.results[0].categories ? 
          Object.keys(moderation.results[0].categories).filter(
            k => moderation.results[0].categories[k]
          ) : [];
        score = Math.max(...Object.values(moderation.results[0].category_scores ?? {}).map(v => Number(v) || 0));
      }
      
      const { data: moderationEvent, error: moderationInsertError } = await supabaseAdmin
        .from("moderation_events")
        .insert({
          subject_type: "message",
          subject_id: String(message.id),
          class_id: room.class_id,
          rule: rule,
          status: "flagged",
          severity: flagReason || 'moderate_severity',
          labels: labels,
          score: score
        })
        .select()
        .single();

      if (moderationInsertError) {
        console.error("Error inserting moderation_event:", moderationInsertError);
      } else {
        // Trigger parent notification (database trigger will handle batching)
        console.log('Flagged moderation_event inserted:', moderationEvent?.id || moderationEvent);
      }
    }

    // 6) Return success response with flag warning
    return new Response(
      JSON.stringify({ 
        status: action === "flag" ? "flagged" : "allow",
        message_id: message.id,
        created_at: message.created_at,
        flagged: action === "flag",
        warning: action === "flag" ? "Din besked blev sendt, men markeret til gennemgang på grund af muligt upassende indhold." : undefined
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
