import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;
    const body = await request.json();
    const { email, role_in_class } = body;

    if (!email || !role_in_class) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (searchError) {
      return NextResponse.json(
        { error: 'Failed to search for user' },
        { status: 500 }
      );
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found with that email' },
        { status: 404 }
      );
    }

    // Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from('class_members')
      .select('*')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this class' },
        { status: 400 }
      );
    }

    // Add user to class
    const { error: insertError } = await supabaseAdmin
      .from('class_members')
      .insert({
        class_id: classId,
        user_id: user.id,
        role_in_class,
        status: 'active',
      });

    if (insertError) {
      console.error('Error adding member:', insertError);
      return NextResponse.json(
        { error: 'Failed to add member to class' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in add member API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
