import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;
    const body = await request.json();
    const { email, role_in_class, display_name, parent_id } = body;

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

    // Update display name if provided
    if (display_name) {
      await supabaseAdmin
        .from('profiles')
        .update({ display_name })
        .eq('user_id', user.id);
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

    // If this is a child and a parent is selected, create guardian link
    if (role_in_class === 'child' && parent_id) {
      const { error: linkError } = await supabaseAdmin
        .from('guardian_links')
        .insert({
          child_user_id: user.id,
          guardian_user_id: parent_id,
          relationship: 'parent',
          consent_status: 'granted',
        });

      if (linkError) {
        console.error('Error creating guardian link:', linkError);
        // Don't fail the whole operation if guardian link fails
      }
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
