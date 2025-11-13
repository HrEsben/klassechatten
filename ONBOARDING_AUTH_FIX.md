# Onboarding Authentication Fix

## Problem
Bruger blev sendt til onboarding-siden efter tilmelding, men var ikke logget ind → "Du skal være logget ind for at oprette en klasse"

## Root Cause
1. **Email bekræftelse**: Supabase kan kræve email-bekræftelse før sessionen oprettes
2. **Ingen session check**: Onboarding-siden checkede ikke om brugeren faktisk var logget ind
3. **Race condition**: Omdirigering skete før auth-state var fuldt synkroniseret

## Løsning

### 1. Tilføjet Auth Guard til Onboarding-siden
```typescript
// Tjek om bruger er logget ind
if (!user) {
  // Vis "Ikke Logget Ind" besked med link til login
  return <NotLoggedInMessage />;
}
```

### 2. Opdateret SignUp Flow
```typescript
const { data, error } = await signUp(email, password, metadata);

if (!data.session) {
  // Ingen session = email bekræftelse kræves
  setError('Tjek din email for at bekræfte din konto');
} else {
  // Session findes = bruger er logget ind
  // Øget delay til 1.5 sekunder for bedre synkronisering
  await new Promise(resolve => setTimeout(resolve, 1500));
  window.location.href = '/onboarding';
}
```

### 3. Forbedret Type Safety
- Opdateret `SignUpResponse` interface til at returnere både `data` og `error`
- TypeScript kan nu fange fejl hvor session mangler

## Mulige Scenarier

### Scenarie A: Email Bekræftelse Aktiveret (default)
1. Bruger tilmelder sig
2. Supabase sender bekræftelses-email
3. Ingen session oprettes
4. Bruger ser: "Tjek din email for at bekræfte din konto"
5. Bruger klikker link i email → logger ind → går til onboarding

### Scenarie B: Email Bekræftelse Deaktiveret
1. Bruger tilmelder sig
2. Session oprettes øjeblikkeligt
3. Bruger omdirigeres til onboarding efter 1.5 sekunder
4. Kan oprette klasse med det samme ✅

## Sådan Deaktiveres Email Bekræftelse

For bedre brugeroplevelse under udvikling:

1. Gå til Supabase Dashboard → Authentication → Settings
2. Find "Enable email confirmations"
3. Deaktiver den
4. Gem

Nu kan brugere tilmelde sig og gå direkte til onboarding uden at tjekke email! 🎉

## Test Flow
1. Tilmeld ny bruger på `/login`
2. Hvis email-bekræftelse er aktiveret → Tjek email og klik link
3. Hvis deaktiveret → Automatisk omdirigering til `/onboarding`
4. Opret klasse → Burde virke! ✨

## Files Modified
- `/apps/web/src/app/onboarding/page.tsx` - Auth guard + loading state
- `/apps/web/src/contexts/AuthContext.tsx` - Return session data fra signUp
- `/apps/web/src/components/LoginForm.tsx` - Tjek for session før omdirigering
