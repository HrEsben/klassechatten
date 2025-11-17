# OpenAI Token Usage Analysis & Cost Optimization Options

## 📊 Current Token Usage Breakdown

Based on your codebase analysis, here's where tokens are being consumed:

### Per Message Flow:

1. **OpenAI Moderation API** (`omni-moderation-latest`)
   - **Cost**: FREE ✅
   - **When**: Every message (text + images)
   - **Tokens**: ~50-100 tokens per call
   - **Usage**: ~7,000 tokens for your testing = ~100 messages

2. **GPT-4o-mini Suggestion Generator**
   - **Cost**: $0.150 per 1M input tokens, $0.600 per 1M output tokens 💰
   - **When**: Only for FLAGGED messages
   - **Tokens per call**: 
     - Input: ~200 tokens (system prompt + user message)
     - Output: ~80 tokens (max_tokens set to 80)
     - **Total: ~280 tokens per flagged message**
   - **Usage**: If 25 of your 100 test messages were flagged = ~7,000 tokens
   
### 💡 Key Finding:
**Your 7,000 tokens are coming from GPT-4o-mini suggestion generation!**

If 25 messages were flagged during testing, that's:
- 25 × 280 tokens = 7,000 tokens
- Cost: ~$0.0014 (less than a penny)

## 📈 Projected Production Costs

### Scenario 1: Small School (100 active students)
**Assumptions:**
- 50 messages per student per day
- 5,000 messages/day
- 5% flagged (250 messages)

**Daily costs:**
- Moderation API: FREE
- GPT-4o-mini: 250 × 280 tokens = 70,000 tokens/day
  - Input: 250 × 200 = 50,000 tokens × $0.15/1M = $0.0075
  - Output: 250 × 80 = 20,000 tokens × $0.60/1M = $0.012
  - **Total: $0.02/day = $7.30/month**

### Scenario 2: Medium School (500 active students)
- 25,000 messages/day
- 1,250 flagged messages/day
- **Cost: $0.10/day = $36.50/month**

### Scenario 3: Large Deployment (5,000 students)
- 250,000 messages/day
- 12,500 flagged messages/day
- **Cost: $1.00/day = $365/month**

### Scenario 4: Multi-School Platform (50,000 students)
- 2,500,000 messages/day
- 125,000 flagged messages/day
- **Cost: $10.00/day = $3,650/month** 💸

---

## 🔄 Cost Optimization Solutions

### Option 1: **Remove GPT-4o-mini Suggestions Entirely** ⚡️

**How it works:**
- Keep FREE OpenAI moderation
- Remove suggestion generation
- Just flag messages without AI suggestions

**Implementation:**
```typescript
// Simply comment out or remove lines 252-279 in create_message/index.ts
// The flagging still works, just no suggestions
```

**Pros:**
- ✅ Zero token costs (100% free)
- ✅ Fastest response time
- ✅ Still have AI moderation detection
- ✅ Teachers still get flagged messages

**Cons:**
- ❌ No helpful rewrite suggestions for students
- ❌ Less educational value
- ❌ Students don't learn how to rephrase

**Cost Reduction:** 100% (from $7.30/month to $0 for 100 students)

**Recommendation:** ⭐⭐⭐⭐⭐ **Best for tight budgets**

---

### Option 2: **Generate Suggestions Only on User Request** 🎯

**How it works:**
- Flag message immediately (free moderation)
- Show "Get suggestion" button
- Only call GPT-4o-mini when user clicks

**Implementation changes needed:**
1. Remove suggestion from initial moderation
2. Add new Edge Function: `generate_suggestion`
3. Add "Show alternative" button in UI
4. Only charge tokens when requested

**Pros:**
- ✅ Dramatically reduced costs (maybe 10-20% of users request)
- ✅ Still educational when needed
- ✅ User choice/control
- ✅ Free moderation still works

**Cons:**
- ❌ Requires UI changes
- ❌ Extra click for students
- ❌ Some students won't bother requesting

**Cost Reduction:** ~80-90% (from $7.30 to $0.73-$1.46 for 100 students)

**Recommendation:** ⭐⭐⭐⭐ **Best balance of cost and features**

---

### Option 3: **Pre-generate Template Suggestions** 📝

**How it works:**
- Create database of common profanity → polite alternatives
- Match detected words to templates
- Only use GPT-4o-mini for novel/complex cases

**Implementation:**
```typescript
// Database table: suggestion_templates
// { profanity: "lort", suggestion: "det er ikke fedt", language: "da" }

// In Edge Function:
if (detectedProfanity && templateExists(detectedProfanity)) {
  suggested = getTemplate(detectedProfanity); // FREE
} else {
  suggested = await callGPT4oMini(body); // PAID
}
```

**Pros:**
- ✅ 80-90% cost reduction (most profanity is common)
- ✅ Instant suggestions (no API delay)
- ✅ Consistent messaging
- ✅ Still have AI fallback for edge cases

**Cons:**
- ❌ Need to build/maintain template database
- ❌ Less personalized suggestions
- ❌ Templates might feel generic

**Cost Reduction:** ~80-90% (from $7.30 to $0.73-$1.46 for 100 students)

**Recommendation:** ⭐⭐⭐ **Good middle ground, requires dev work**

---

### Option 4: **Rate Limit Suggestions Per User** ⏱️

**How it works:**
- Track suggestion requests per user
- Limit to 3-5 suggestions per user per day
- After limit: just flag, no suggestion

**Implementation:**
```typescript
// Check Redis/database for user's suggestion count today
const suggestionCount = await getSuggestionCount(user.id, today);
if (suggestionCount < 5) {
  suggested = await callGPT4oMini(body);
  await incrementSuggestionCount(user.id);
}
```

**Pros:**
- ✅ Predictable max costs
- ✅ Prevents abuse/spam
- ✅ Still helpful for most users
- ✅ Teaches students to learn from first few

**Cons:**
- ❌ Need rate limiting infrastructure
- ❌ Might frustrate prolific chatters
- ❌ Some legitimate messages won't get suggestions

**Cost Reduction:** ~70-80% (from $7.30 to $1.46-$2.19 for 100 students)

**Recommendation:** ⭐⭐⭐ **Good for preventing abuse**

---

### Option 5: **Use Cheaper Alternative Model** 🤖

**How it works:**
- Replace GPT-4o-mini with even cheaper option
- Options: GPT-3.5-turbo, open-source models via Replicate/HuggingFace

**GPT-3.5-turbo pricing:**
- Input: $0.50/1M tokens (3.3x cheaper)
- Output: $1.50/1M tokens (2.5x cheaper)

**Open-source (via Replicate/HuggingFace):**
- Llama 3 8B: ~$0.05-$0.10 per 1M tokens (90% cheaper!)
- But: Quality varies, Danish support uncertain

**Pros:**
- ✅ Significant cost reduction (60-90%)
- ✅ Still automated suggestions
- ✅ Keep same user flow

**Cons:**
- ❌ Lower quality suggestions (especially for Danish)
- ❌ GPT-3.5 is being phased out
- ❌ Open-source needs more testing
- ❌ Self-hosting open-source has infrastructure costs

**Cost Reduction:** 60-90% depending on model

**Recommendation:** ⭐⭐ **Risky - quality concerns**

---

### Option 6: **Batch Suggestions Weekly for Review** 📦

**How it works:**
- Flag messages immediately (free)
- Store flagged messages
- Generate suggestions in weekly batch job
- Teachers review suggestions + original messages

**Implementation:**
- Cron job runs Sunday night
- Processes all week's flagged messages at once
- Sends digest email to teachers

**Pros:**
- ✅ Can negotiate better rates for batch processing
- ✅ Teachers get curated list
- ✅ Educational review material
- ✅ Not time-sensitive (offline processing)

**Cons:**
- ❌ No immediate student feedback
- ❌ Less educational in real-time
- ❌ Teachers get batch work

**Cost Reduction:** Minimal (same token usage, just batched)

**Recommendation:** ⭐⭐ **Changes user experience significantly**

---

### Option 7: **Hybrid Approach** 🎭

**Combine multiple strategies:**

1. **Template matching first** (free, instant)
2. **On-demand GPT for complex cases** (user clicks button)
3. **Rate limit to 3/day per user** (prevents abuse)
4. **Use GPT-4o-mini only for ages 10+** (younger kids get templates only)

**Cost Reduction:** ~90-95% (from $7.30 to $0.37-$0.73)

**Recommendation:** ⭐⭐⭐⭐⭐ **Best overall approach**

---

## 📋 Recommendation Summary

### Immediate Action (Ship to Production TODAY):
**Option 2: On-demand suggestions**
- Change flag → suggestion flow to flag → show button → suggestion
- Reduces costs by 80-90%
- Keeps educational value
- Minimal dev work (2-3 hours)

### Long-term Optimization (Next Sprint):
**Option 7: Hybrid approach**
- Build template database (~50-100 common phrases)
- Keep on-demand GPT for complex cases
- Add rate limiting
- Target: <$1/month per 100 students

### If Budget is Critical:
**Option 1: Remove suggestions entirely**
- Costs go to $0
- Still have AI moderation (free)
- Can add suggestions back later when funded

---

## 💰 Cost Comparison Table

| Solution | 100 Students | 500 Students | 5,000 Students | Dev Work | Risk |
|----------|--------------|--------------|----------------|----------|------|
| **Current** | $7.30/mo | $36.50/mo | $365/mo | ✅ Done | Low |
| **Option 1: No suggestions** | $0 | $0 | $0 | 30 min | Low |
| **Option 2: On-demand** | $0.73/mo | $3.65/mo | $36.50/mo | 2-3 hrs | Low |
| **Option 3: Templates** | $1.46/mo | $7.30/mo | $73/mo | 8-10 hrs | Medium |
| **Option 4: Rate limiting** | $2.19/mo | $10.95/mo | $109.50/mo | 3-4 hrs | Low |
| **Option 5: Cheaper model** | $2.92/mo | $14.60/mo | $146/mo | 2-3 hrs | High |
| **Option 7: Hybrid** | $0.37/mo | $1.83/mo | $18.30/mo | 12-15 hrs | Low |

---

## 🔧 Implementation Guide for Option 2 (Recommended)

### Step 1: Create new Edge Function
```bash
supabase functions new generate_suggestion
```

### Step 2: Move suggestion logic
```typescript
// supabase/functions/generate_suggestion/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.70.2";

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

serve(async (req) => {
  const { message_id, original_text } = await req.json();
  
  // Verify user has permission to see this message
  // ... auth checks ...
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Du er en hjælpsom assistent..." },
      { role: "user", content: original_text }
    ],
    max_tokens: 80,
    temperature: 0.5
  });
  
  return new Response(JSON.stringify({ 
    suggestion: completion.choices[0]?.message?.content 
  }));
});
```

### Step 3: Update create_message function
Remove lines 252-279 (suggestion generation)

### Step 4: Update UI
Add button to flagged message warnings:
```typescript
{flagged && (
  <button onClick={async () => {
    const { suggestion } = await generateSuggestion(messageId, originalText);
    setSuggestion(suggestion);
  }}>
    Se forslag til alternativ besked
  </button>
)}
```

### Step 5: Deploy
```bash
supabase functions deploy generate_suggestion
```

**Estimated implementation time:** 2-3 hours

---

## 🎯 Final Recommendation

**For production launch:** Implement **Option 2 (On-demand suggestions)**

**Why:**
- ✅ 80-90% cost reduction immediately
- ✅ Keeps educational value where students want it
- ✅ Low development effort
- ✅ Can iterate to Option 7 (Hybrid) later
- ✅ Predictable costs scale linearly with engagement

**Expected costs at scale:**
- 100 students: $0.73/month
- 500 students: $3.65/month
- 5,000 students: $36.50/month

These costs are sustainable and scale reasonably with revenue.

---

## 📞 Questions?

If you need help implementing any of these options, let me know which approach you prefer and I can start coding it immediately!
