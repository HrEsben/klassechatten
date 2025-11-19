import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getUserFromRequest } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { childId } = body;

    if (!childId) {
      return NextResponse.json(
        { error: 'Missing childId' },
        { status: 400 }
      );
    }

    // Call database function to generate invite code
    const { data, error } = await supabaseAdmin.rpc('generate_guardian_invite_code', {
      p_child_user_id: childId,
      p_requesting_guardian_id: user.id,
    });

    if (error) {
      console.error('Error generating invite code:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inviteCode: data,
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
