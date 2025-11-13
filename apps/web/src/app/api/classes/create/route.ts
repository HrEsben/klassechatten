import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.error('Authentication failed: No token in Authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - Please make sure you are logged in' },
        { status: 401 }
      );
    }

    // Verify the token and get user
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id, user.email);

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

    if (gradeLevel < 0 || gradeLevel > 10) {
      return NextResponse.json(
        { error: 'Grade level must be between 0 and 10' },
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
