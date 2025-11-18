import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { status } = body; // 'confirmed' or 'dismissed'

    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify user has permission (admin or class admin)
    const isAdmin = profile.role === 'admin';
    
    // Get the moderation event to check class membership
    const { data: event, error: eventError } = await supabaseAdmin
      .from('moderation_events')
      .select('class_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Moderation event not found' }, { status: 404 });
    }

    // Check if user is class admin for this class
    let isClassAdmin = false;
    if (!isAdmin) {
      const { data: classMember } = await supabaseAdmin
        .from('class_members')
        .select('is_class_admin')
        .eq('user_id', user.id)
        .eq('class_id', event.class_id)
        .eq('status', 'active')
        .single();

      isClassAdmin = classMember?.is_class_admin === true;
    }

    if (!isAdmin && !isClassAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the moderation event status
    const { error: updateError } = await supabaseAdmin
      .from('moderation_events')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (updateError) {
      console.error('Error updating moderation event:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in moderation event update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
