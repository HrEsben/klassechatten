import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Custom storage to sync session to cookies for server-side access
const cookieStorage = {
  getItem: (key: string) => {
    if (typeof document === 'undefined') return null;
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${key}=`));
    return cookie ? cookie.split('=')[1] : null;
  },
  setItem: (key: string, value: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${key}=${value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  },
  removeItem: (key: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${key}=; path=/; max-age=0`;
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: cookieStorage,
    storageKey: 'sb',
  },
});
