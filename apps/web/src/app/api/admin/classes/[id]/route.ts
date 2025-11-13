import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;

    // Fetch class details
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select(`
        id,
        label,
        grade_level,
        invite_code,
        created_at,
        schools (
          name
        )
      `)
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Fetch all members with profile data
    const { data: members, error: membersError } = await supabaseAdmin
      .from('class_members')
      .select(`
        user_id,
        role_in_class,
        joined_at,
        status
      `)
      .eq('class_id', classId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    // Fetch profile and auth data for each member
    const membersWithDetails = await Promise.all(
      (members || []).map(async (member: any) => {
        // Get profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('display_name, avatar_url, avatar_color, role')
          .eq('user_id', member.user_id)
          .single();

        // Get auth data
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(member.user_id);

        return {
          user_id: member.user_id,
          email: authUser?.email || 'N/A',
          display_name: profile?.display_name || 'N/A',
          avatar_url: profile?.avatar_url,
          avatar_color: profile?.avatar_color,
          role_in_class: member.role_in_class,
          profile_role: profile?.role,
          joined_at: member.joined_at,
          status: member.status,
        };
      })
    );

    // Fetch rooms
    const { data: rooms } = await supabaseAdmin
      .from('rooms')
      .select('id, name, type, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      class: {
        id: classData.id,
        label: classData.label,
        grade_level: classData.grade_level,
        invite_code: classData.invite_code,
        created_at: classData.created_at,
        school_name: (classData.schools as any)?.name || null,
      },
      members: membersWithDetails,
      rooms: rooms || [],
    });

  } catch (error) {
    console.error('Error in class details API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;

    // Delete the class (cascade will handle related records)
    const { error } = await supabaseAdmin
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) {
      console.error('Error deleting class:', error);
      return NextResponse.json(
        { error: 'Failed to delete class' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in delete class API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
