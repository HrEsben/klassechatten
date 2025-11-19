import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Fetch all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Fetch auth users to get email and last_sign_in_at
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Auth users fetch error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Combine profile and auth data
    const combinedUsers = profiles.map(profile => {
      const authUser = authUsers.find(u => u.id === profile.user_id);
      return {
        user_id: profile.user_id,
        email: authUser?.email || 'N/A',
        role: profile.role,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        avatar_color: profile.avatar_color,
        created_at: profile.created_at,
        last_sign_in_at: authUser?.last_sign_in_at,
      };
    });

    return NextResponse.json({ users: combinedUsers });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    );
  }
}
