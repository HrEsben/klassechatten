import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getUserFromRequest } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Missing invitationId' },
        { status: 400 }
      );
    }

    // Get invitation details
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from('guardian_invitations')
      .select('child_id, inviter_guardian_id, status')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Verify user is the inviter
    if (invitation.inviter_guardian_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to cancel this invitation' },
        { status: 403 }
      );
    }

    // Cancel the invitation
    const { error: updateError } = await supabaseAdmin
      .from('guardian_invitations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('[API] Error cancelling invitation:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled',
    });
  } catch (error: any) {
    console.error('[API] Error in cancel-invite:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
