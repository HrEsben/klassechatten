import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;
    const body = await request.json();
    const { nickname, moderation_level, profanity_filter_enabled } = body;

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a global admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isGlobalAdmin = profile?.role === 'admin';

    // Check if user is a class admin
    const { data: membership } = await supabaseAdmin
      .from('class_members')
      .select('is_class_admin')
      .eq('user_id', user.id)
      .eq('class_id', classId)
      .single();

    const isClassAdmin = membership?.is_class_admin === true;

    if (!isGlobalAdmin && !isClassAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins and class admins can update class settings' },
        { status: 403 }
      );
    }

    // Validate nickname
    if (nickname !== null && nickname !== undefined) {
      if (typeof nickname !== 'string') {
        return NextResponse.json(
          { error: 'Nickname must be a string' },
          { status: 400 }
        );
      }
      
      if (nickname.length > 50) {
        return NextResponse.json(
          { error: 'Nickname must be 50 characters or less' },
          { status: 400 }
        );
      }
    }

    // Validate moderation_level
    if (moderation_level !== null && moderation_level !== undefined) {
      const validLevels = ['strict', 'moderate', 'relaxed'];
      if (!validLevels.includes(moderation_level)) {
        return NextResponse.json(
          { error: 'Moderation level must be one of: strict, moderate, relaxed' },
          { status: 400 }
        );
      }
    }

    // Validate profanity_filter_enabled
    if (profanity_filter_enabled !== null && profanity_filter_enabled !== undefined) {
      if (typeof profanity_filter_enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Profanity filter enabled must be a boolean' },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (nickname !== undefined) {
      updateData.nickname = nickname?.trim() || null;
    }
    if (moderation_level !== undefined) {
      updateData.moderation_level = moderation_level;
    }
    if (profanity_filter_enabled !== undefined) {
      updateData.profanity_filter_enabled = profanity_filter_enabled;
    }

    // Update the class
    const { data: updatedClass, error: updateError } = await supabaseAdmin
      .from('classes')
      .update(updateData)
      .eq('id', classId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating class:', updateError);
      return NextResponse.json(
        { error: 'Failed to update class' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Error in PATCH /api/classes/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
