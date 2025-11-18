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
    // Note: Both teachers AND guardians can be class admins
    let isClassAdmin = false;
    if (classId && (isTeacher || isParent)) {
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

    // If teacher without classId, deny access (class admins must specify their class)
    if (!isAdmin && !isParent && isTeacher && !classId) {
      return NextResponse.json({ error: 'Class ID required for teachers' }, { status: 400 });
    }

    // If teacher with classId but NOT a class admin, deny access
    if (!isAdmin && !isParent && isTeacher && classId && !isClassAdmin) {
      console.log('[Flagged Messages API] Teacher is not class admin, denying access');
      return NextResponse.json({ error: 'Must be class admin to view flagged messages' }, { status: 403 });
    }

    // If parent (guardian) accessing via class, they must be a class admin
    // Otherwise, they can only see their children's messages across all classes
    const parentAccessViaClassAdmin = isParent && classId && isClassAdmin;

    console.log('[Flagged Messages API] User role:', profile.role);
    console.log('[Flagged Messages API] Is class admin:', isClassAdmin);
    console.log('[Flagged Messages API] Is parent:', isParent);
    console.log('[Flagged Messages API] Is admin:', isAdmin);
    console.log('[Flagged Messages API] Parent access via class admin:', parentAccessViaClassAdmin);

    // Get status filter from query params (default to 'flagged')
    const statusFilter = searchParams.get('status') || 'flagged';

    // Build base query - fetch moderation_events only
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
        reviewed_by,
        reviewed_at
      `)
      .eq('subject_type', 'message')
      .eq('status', statusFilter)
      .order('created_at', { ascending: false });

    // Filter by class if provided
    if (classId) {
      query = query.eq('class_id', classId);
    }

    // Filter by severity if provided
    if (severity) {
      query = query.eq('severity', severity);
    }

    // Execute query
    const { data: moderationEvents, error } = await query;

    console.log('[Flagged Messages API] Query params:', { classId, severity });
    console.log('[Flagged Messages API] Moderation events found:', moderationEvents?.length || 0);

    if (error) {
      console.error('Error fetching moderation events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!moderationEvents || moderationEvents.length === 0) {
      console.log('[Flagged Messages API] No moderation events found, returning empty array');
      return NextResponse.json({ flagged_messages: [] });
    }

    // Get unique message IDs (convert string to number)
    const messageIds = [...new Set(moderationEvents.map((e: any) => parseInt(e.subject_id)))];
    
    console.log('[Flagged Messages API] Message IDs to fetch:', messageIds);

    // Fetch messages with profiles and room names
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        body,
        user_id,
        room_id,
        created_at,
        meta,
        profiles (
          user_id,
          display_name,
          avatar_url,
          avatar_color
        ),
        rooms (
          id,
          name
        )
      `)
      .in('id', messageIds);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    console.log('[Flagged Messages API] Messages fetched:', messages?.length || 0);
    console.log('[Flagged Messages API] First message:', messages?.[0]);

    // Create a map of messages by ID for quick lookup
    const messagesMap = new Map((messages || []).map((m: any) => [m.id, m]));

    // If parent AND NOT a class admin, filter to only their children's messages
    // Class admins (regardless of role) can see all messages in their class
    if (isParent && !isClassAdmin) {
      console.log('[Flagged Messages API] Filtering for parent (not class admin):', user.id);
      
      const { data: children, error: childrenError } = await supabaseAdmin
        .from('guardian_links')
        .select('child_user_id')
        .eq('guardian_user_id', user.id);

      console.log('[Flagged Messages API] Children found:', children?.length || 0);
      console.log('[Flagged Messages API] Children IDs:', children?.map(c => c.child_user_id));

      if (childrenError) {
        console.error('[Flagged Messages API] Error fetching children:', childrenError);
        return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
      }

      const childrenIds = children.map(c => c.child_user_id);
      
      if (childrenIds.length === 0) {
        console.log('[Flagged Messages API] Parent has no children, returning empty array');
        return NextResponse.json({ flagged_messages: [] });
      }

      // Filter moderation events to only include messages from children
      const filteredEvents = moderationEvents.filter((event: any) => {
        const message = messagesMap.get(parseInt(event.subject_id));
        const isFromChild = message && childrenIds.includes(message.user_id);
        if (!isFromChild) {
          console.log('[Flagged Messages API] Filtering out message', event.subject_id, 'from user', message?.user_id);
        }
        return isFromChild;
      });

      console.log('[Flagged Messages API] Filtered events count:', filteredEvents.length);

      // Update moderationEvents to filtered list
      moderationEvents.length = 0;
      moderationEvents.push(...filteredEvents);
    } else if (isParent && isClassAdmin) {
      console.log('[Flagged Messages API] Parent is class admin, showing all class messages');
    }

    // Create flagged messages array without context (for now, to improve performance)
    const flaggedMessagesWithContext = (moderationEvents || []).map((event: any) => {
      const messageId = parseInt(event.subject_id);
      const message = messagesMap.get(messageId);

      if (!message) {
        console.warn('[Flagged Messages API] Message not found for ID:', messageId);
        return null;
      }

      return {
        event_id: event.id,
        message_id: messageId,
        class_id: event.class_id,
        room_id: message.room_id,
        room: message.rooms,
        rule: event.rule,
        score: event.score,
        labels: event.labels,
        severity: event.severity,
        created_at: event.created_at,
        message: {
          id: message.id,
          body: message.body,
          user_id: message.user_id,
          room_id: message.room_id,
          created_at: message.created_at,
          author: message.profiles,
        },
        context: { before: [], after: [] },
      };
    });

    // Filter out any null entries (messages that weren't found)
    const validMessages = flaggedMessagesWithContext.filter((m) => m !== null);

    console.log('[Flagged Messages API] Valid messages after filtering:', validMessages.length);
    console.log('[Flagged Messages API] First valid message:', validMessages[0]);

    // Backwards-compatibility: include legacy flagged messages (messages.is_flagged=true)
    // that might have been created before moderation_events were introduced.
    // Only include in 'all' or 'moderate_severity' filter cases (no reliable severity for legacy).
    let legacyMessages: any[] = [];
    const requestedSeverity = severity; // may be null

    if (!requestedSeverity || requestedSeverity === 'moderate_severity') {
      // Build legacy query from messages
      let legacyQuery = supabaseAdmin
        .from('messages')
        .select(`
          id,
          body,
          user_id,
          room_id,
          class_id,
          created_at,
          profiles (
            user_id,
            display_name,
            avatar_url,
            avatar_color
          )
        `)
        .eq('is_flagged', true)
        .order('created_at', { ascending: false });

      if (classId) {
        legacyQuery = legacyQuery.eq('class_id', classId);
      }

      if (isParent) {
        // Parent filter: only children's messages
        const { data: children, error: childrenError } = await supabaseAdmin
          .from('guardian_links')
          .select('child_user_id')
          .eq('guardian_user_id', user.id);

        if (!childrenError) {
          const childrenIds = (children || []).map((c: any) => c.child_user_id);
          if (childrenIds.length === 0) {
            legacyMessages = [];
          } else {
            legacyQuery = legacyQuery.in('user_id', childrenIds);
          }
        }
      }

      const { data: legacyData, error: legacyError } = await legacyQuery;
      if (!legacyError && legacyData) {
        // Exclude ones already represented by moderation_events
        const existingMsgIds = new Set((moderationEvents || []).map((e: any) => Number(e.subject_id)));
        legacyMessages = (legacyData as any[]).filter((m: any) => !existingMsgIds.has(Number(m.id)));
      }

      // Map legacy messages to the same shape (without context)
      const legacyMapped = (legacyMessages || []).map((m: any) => ({
        event_id: `legacy-${m.id}`,
        message_id: m.id,
        class_id: m.class_id,
        rule: 'legacy:is_flagged',
        score: 0,
        labels: [],
        severity: 'moderate_severity',
        created_at: m.created_at,
        message: {
          id: m.id,
          body: m.body,
          user_id: m.user_id,
          created_at: m.created_at,
          author: m.profiles,
        },
        context: { before: [], after: [] },
      }));

      // Merge: moderation events first, then legacy
      const merged = [...validMessages, ...legacyMapped];
      return NextResponse.json({ flagged_messages: merged });
    }

    return NextResponse.json({ flagged_messages: validMessages });
  } catch (error) {
    console.error('Error in flagged messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
