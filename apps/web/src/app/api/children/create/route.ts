import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getUserFromRequest } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    // Get current user (parent/guardian)
    const user = await getUserFromRequest();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { classId, username, displayName, password, email } = body;

    // Validate inputs
    if (!classId || !username || !displayName || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain lowercase letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check parent is member of the class
    const { data: membership } = await supabase
      .from('class_members')
      .select('role_in_class')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['guardian', 'adult'].includes(membership.role_in_class)) {
      return NextResponse.json(
        { error: 'You must be a guardian or adult in this class' },
        { status: 403 }
      );
    }

    // Call the database function to create child account
    const { data, error } = await supabase.rpc('create_child_account', {
      p_class_id: classId,
      p_parent_id: user.id,
      p_child_username: username,
      p_child_display_name: displayName,
      p_child_password: password,
      p_child_email: email || null,
    });

    if (error) {
      console.error('Error creating child account:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create child account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      child: data,
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
