import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Find profile by username
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('username', username.toLowerCase())
      .single();

    if (error || !profile) {
      // Don't reveal if username exists or not (security)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 404 }
      );
    }

    // Get auth user to retrieve email
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: authUser.user.email,
    });

  } catch (error: any) {
    console.error('Username lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
