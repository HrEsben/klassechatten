import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function getUserFromRequest() {
  const cookieStore = await cookies();
  
  // Debug: Log all cookies
  const allCookies = cookieStore.getAll();
  console.log('All cookies:', allCookies.map(c => c.name));
  
  // Try to get the session data from cookie
  const sessionCookie = cookieStore.get('sb')?.value;
  
  console.log('Session cookie found:', !!sessionCookie);
  
  if (!sessionCookie) {
    console.log('No session cookie found');
    return null;
  }

  try {
    // Parse the session data
    const sessionData = JSON.parse(sessionCookie);
    
    console.log('Session data keys:', Object.keys(sessionData));
    
    if (!sessionData.access_token || !sessionData.refresh_token) {
      console.log('Missing tokens in session data');
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
      console.error('Auth error:', error);
      return null;
    }

    console.log('User authenticated successfully:', user.email);
    return user;
  } catch (error) {
    console.error('Error parsing session cookie:', error);
    return null;
  }
}
