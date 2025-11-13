import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Please make sure you are logged in' },
        { status: 401 }
      );
    }

    // Verify the token and get user
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { inviteCode } = body;

    // Validate input
    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }

    const normalizedCode = inviteCode.trim().toUpperCase();

    // Find class by invite code
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, label, nickname, school_id, schools(name)')
      .eq('invite_code', normalizedCode)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Invalid invitation code' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classData.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this class' },
        { status: 400 }
      );
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Add user to class with appropriate role
    const { error: memberError } = await supabase
      .from('class_members')
      .insert({
        class_id: classData.id,
        user_id: user.id,
        role_in_class: profile.role, // Use their profile role
      });

    if (memberError) {
      console.error('Error adding class member:', memberError);
      return NextResponse.json(
        { error: 'Failed to join class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      class: {
        id: classData.id,
        label: classData.label,
        nickname: classData.nickname,
        school: classData.schools,
      },
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
