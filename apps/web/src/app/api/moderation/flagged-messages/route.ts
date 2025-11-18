import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('class_id') || searchParams.get('classId');
    const severity = searchParams.get('severity');
    const userId = searchParams.get('user_id'); // For filtering by specific user

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

    const isParent = profile.role === 'guardian';
    const isAdmin = profile.role === 'admin';
    const isTeacher = profile.role === 'adult';
    
    // Check if user is a class admin (if classId is provided)
    let isClassAdmin = false;
    if (classId && isTeacher) {
      const { data: classMember, error: classMemberError } = await supabaseAdmin
        .from('class_members')
        .select('is_class_admin')
        .eq('user_id', user.id)
        .eq('class_id', classId)
        .eq('status', 'active')
        .single();

      if (!classMemberError && classMember) {
        isClassAdmin = classMember.is_class_admin === true;
      }
    }

    // Verify permissions
    if (!isParent && !isAdmin && !isTeacher) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // If teacher/class admin without classId, deny access (class admins must specify their class)
    if (!isAdmin && !isParent && isTeacher && !classId) {
      return NextResponse.json({ error: 'Class ID required for teachers' }, { status: 400 });
    }

    // Build base query
    let query = supabaseAdmin
      .from('moderation_events')
      .select(`
        id,
        subject_id,
        class_id,
        rule,
        score,
        labels,
        status,
        severity,
        created_at,
        messages!inner (
          id,
          body,
          user_id,
          room_id,
          created_at,
          meta,
          profiles!inner (
            user_id,
            display_name,
            avatar_url,
            avatar_color
          )
        )
      `)
      .eq('subject_type', 'message')
      .eq('status', 'flagged')
      .order('created_at', { ascending: false });

    // Filter by class if provided
    if (classId) {
      query = query.eq('class_id', classId);
    }

    // Filter by severity if provided
    if (severity) {
      query = query.eq('severity', severity);
    }

    // If parent, only show their children's messages
    if (isParent) {
      const { data: children, error: childrenError } = await supabaseAdmin
        .from('guardian_links')
        .select('child_user_id')
        .eq('guardian_user_id', user.id);

      if (childrenError) {
        return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
      }

      const childrenIds = children.map(c => c.child_user_id);
      
      if (childrenIds.length === 0) {
        // Parent has no children, return empty array
        return NextResponse.json({ flagged_messages: [] });
      }

      // Filter messages by children's user_ids
      query = query.in('messages.user_id', childrenIds);
    }

    // Execute query
    const { data: moderationEvents, error } = await query;

    if (error) {
      console.error('Error fetching flagged messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For each flagged message, fetch context (2-3 messages before and after)
    const flaggedMessagesWithContext = await Promise.all(
      (moderationEvents || []).map(async (event: any) => {
        const messageId = parseInt(event.subject_id);
        const message = event.messages;

        // Fetch 3 messages before and 3 after
        const { data: contextMessages, error: contextError } = await supabaseAdmin
          .from('messages')
          .select(`
            id,
            body,
            user_id,
            created_at,
            profiles!inner (
              user_id,
              display_name,
              avatar_url,
              avatar_color
            )
          `)
          .eq('room_id', message.room_id)
          .or(`id.lt.${messageId},id.gt.${messageId}`)
          .order('created_at', { ascending: true })
          .limit(6);

        // Separate into before and after
        const before = (contextMessages || [])
          .filter((m: any) => m.id < messageId)
          .slice(-3); // Last 3 before
        const after = (contextMessages || [])
          .filter((m: any) => m.id > messageId)
          .slice(0, 3); // First 3 after

        return {
          event_id: event.id,
          message_id: messageId,
          class_id: event.class_id,
          rule: event.rule,
          score: event.score,
          labels: event.labels,
          severity: event.severity,
          created_at: event.created_at,
          message: {
            id: message.id,
            body: message.body,
            user_id: message.user_id,
            created_at: message.created_at,
            author: message.profiles,
          },
          context: {
            before: before.map((m: any) => ({
              id: m.id,
              body: m.body,
              user_id: m.user_id,
              created_at: m.created_at,
              author: m.profiles,
            })),
            after: after.map((m: any) => ({
              id: m.id,
              body: m.body,
              user_id: m.user_id,
              created_at: m.created_at,
              author: m.profiles,
            })),
          },
        };
      })
    );

    return NextResponse.json({ flagged_messages: flaggedMessagesWithContext });
  } catch (error) {
    console.error('Error in flagged messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
