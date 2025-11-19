import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function getUserFromRequest() {
  const cookieStore = await cookies();
  
  // Try to get the session data from cookie
  const sessionCookie = cookieStore.get('sb')?.value;
  
  if (!sessionCookie) {
    return null;
  }

  try {
    // Parse the session data
    const sessionData = JSON.parse(sessionCookie);
    
    if (!sessionData.access_token || !sessionData.refresh_token) {
      return null;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error } = await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    });

    if (error || !user) {
      console.error('[Auth] Error:', error?.message);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error parsing session cookie:', error);
    return null;
  }
}
