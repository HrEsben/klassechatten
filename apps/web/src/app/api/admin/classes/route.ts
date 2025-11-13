import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    // Fetch all classes with related data
    const { data: classes, error: classesError } = await supabaseAdmin
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
      .order('grade_level', { ascending: true })
      .order('label', { ascending: true });

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
    }

    // For each class, fetch member counts
    const classesWithDetails = await Promise.all(
      (classes || []).map(async (cls: any) => {
        // Get all members
        const { data: members } = await supabaseAdmin
          .from('class_members')
          .select('role_in_class')
          .eq('class_id', cls.id);

        // Get room count
        const { count: roomCount } = await supabaseAdmin
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id);

        const studentCount = members?.filter((m: any) => m.role_in_class === 'child').length || 0;
        const teacherCount = members?.filter((m: any) => m.role_in_class === 'adult').length || 0;
        const parentCount = members?.filter((m: any) => m.role_in_class === 'guardian').length || 0;

        return {
          id: cls.id,
          label: cls.label,
          grade_level: cls.grade_level,
          school_name: cls.schools?.name,
          invite_code: cls.invite_code,
          created_at: cls.created_at,
          member_count: (members?.length || 0),
          student_count: studentCount,
          teacher_count: teacherCount,
          parent_count: parentCount,
          room_count: roomCount || 0,
        };
      })
    );

    return NextResponse.json({ classes: classesWithDetails });

  } catch (error) {
    console.error('Error in admin classes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
