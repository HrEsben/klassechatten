# Moderation Threshold Fix - Death Threats Now Flagged as High Severity

## Issue
Death threats and other serious threatening content were being categorized as "moderate_severity" instead of "high_severity", which didn't trigger urgent notifications to teachers and administrators.

## Root Cause
1. **Threshold too high**: The original `hate/threatening` threshold for moderate level was 0.5, allowing some death threats (scoring 0.5-0.7) to slip through as only moderate severity
2. **Insufficient severity categorization**: Only three categories were checked for high severity, missing important threat types

## Solution Implemented

### 1. Lowered Critical Thresholds
Death threats fall under OpenAI's `hate/threatening` category. New thresholds:

**Moderate (default):**
- `sexual/minors`: 0.3 (was 0.5) ⬇️
- `hate/threatening`: 0.3 (was 0.5) ⬇️ **CRITICAL FOR DEATH THREATS**
- `violence/graphic`: 0.5 (unchanged)

**Strict:**
- `sexual/minors`: 0.2 (was 0.3)
- `hate/threatening`: 0.2 (was 0.3) 
- `violence/graphic`: 0.3 (was 0.3)

**Relaxed:**
- `sexual/minors`: 0.5 (was 0.7)
- `hate/threatening`: 0.5 (was 0.7)
- `violence/graphic`: 0.7 (unchanged)

### 2. Expanded High Severity Detection
Added three severity tiers:

**CRITICAL (High Severity):**
- Sexual content involving minors
- Death threats and threatening hate speech
- Graphic violence

**HIGH (High Severity):**
- Severe sexual content
- Severe violence
- Threatening harassment
- Self-harm content (above threshold + 0.2)

**MODERATE (Moderate Severity):**
- General harassment
- Hate speech (non-threatening)
- Illicit content
- Lower-level self-harm

### 3. Enhanced Logging
Added detailed console logs to track severity decisions:
```
CRITICAL SEVERITY: Death threats, sexual/minors, or graphic violence detected
HIGH SEVERITY: Severe violence, sexual content, or threatening behavior detected
MODERATE SEVERITY: General harassment, hate speech, or illicit content detected
```

## Impact

### Before Fix
```
Death threat message with score 0.6 for "hate/threatening"
→ Flagged: YES
→ Severity: moderate_severity
→ Notification: Standard flag notification
```

### After Fix
```
Death threat message with score 0.6 for "hate/threatening"
→ Flagged: YES
→ Severity: high_severity (CRITICAL tier)
→ Notification: Urgent high-priority notification
→ Console: "CRITICAL SEVERITY: Death threats, sexual/minors, or graphic violence detected"
```

## Deployment

**Deployed**: November 18, 2025
**Edge Function**: `create_message`
**Status**: ✅ Live in production

```bash
supabase functions deploy create_message
```

## Testing Recommendations

1. **Test death threat messages** at different moderation levels:
   - Strict: Should flag at very low thresholds (0.2)
   - Moderate: Should flag at 0.3 threshold
   - Relaxed: Should flag at 0.5 threshold

2. **Verify severity levels**:
   - Check that death threats trigger "high_severity"
   - Check that sexual/minors content triggers "high_severity"
   - Check that general harassment triggers "moderate_severity"

3. **Verify notifications**:
   - High severity should create urgent parent notifications
   - High severity should prioritize teacher dashboard alerts
   - Moderate severity should create standard notifications

## OpenAI Moderation Categories Reference

**Critical Categories** (Always high severity):
- `sexual/minors` - Sexual content involving minors
- `hate/threatening` - **INCLUDES DEATH THREATS**
- `violence/graphic` - Graphic violent content

**High Severity Categories**:
- `sexual` - Sexual content (adults)
- `violence` - Violent content
- `harassment/threatening` - Threatening harassment
- `self-harm` - Self-harm content

**Moderate Severity Categories**:
- `harassment` - General harassment
- `hate` - Hate speech (non-threatening)
- `illicit` - Illegal activities
- `self-harm` - Lower-level self-harm content

## Related Files
- `/supabase/functions/create_message/index.ts` - Main Edge Function
- `/apps/web/src/app/class/[id]/settings/page.tsx` - Moderation level settings UI
- `AI_MODERATION_LEVELS.md` - Original moderation levels documentation

## Notes
- The FREE OpenAI `omni-moderation-latest` API is used
- Danish profanity filter remains active at all levels
- All messages are still inserted (flagged or not) - we flag, not block
- Teachers see flagged messages in their dashboard for review
