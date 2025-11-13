import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getUserFromRequest } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    // Get current user
    const user = await getUserFromRequest();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { schoolName, gradeLevel, classLetter, nickname, studentCount } = body;

    // Validate inputs
    if (!schoolName || gradeLevel === undefined || !classLetter || !studentCount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (gradeLevel < 0 || gradeLevel > 9) {
      return NextResponse.json(
        { error: 'Grade level must be between 0 and 9' },
        { status: 400 }
      );
    }

    if (studentCount < 1 || studentCount > 50) {
      return NextResponse.json(
        { error: 'Student count must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Check user role - only guardians/parents can create classes
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || (profile.role !== 'guardian' && profile.role !== 'adult')) {
      return NextResponse.json(
        { error: 'Only parents and adults can create classes' },
        { status: 403 }
      );
    }

    // Call the database function to create class with students
    const { data, error } = await supabase.rpc('create_class_with_students', {
      p_school_name: schoolName,
      p_grade_level: gradeLevel,
      p_class_letter: classLetter,
      p_nickname: nickname || null,
      p_student_count: studentCount,
      p_creator_id: user.id,
    });

    if (error) {
      console.error('Error creating class:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      class: data,
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
