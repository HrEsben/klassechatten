import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getUserFromRequest } from '@/lib/supabase-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json(
        { error: 'Missing childId parameter' },
        { status: 400 }
      );
    }

    // Verify user is a guardian of this child
    const { data: guardianLink, error: linkError } = await supabaseAdmin
      .from('guardian_links')
      .select('*')
      .eq('guardian_user_id', user.id)
      .eq('child_user_id', childId)
      .single();

    if (linkError || !guardianLink) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Get pending invitations for this child
    const { data: invitations, error: inviteError } = await supabaseAdmin
      .from('guardian_invitations')
      .select('id, invited_email, created_at, expires_at')
      .eq('child_id', childId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (inviteError) {
      console.error('[API] Error fetching pending invitations:', inviteError);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invitations: invitations || [],
    });
  } catch (error: any) {
    console.error('[API] Error in pending-invites:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
