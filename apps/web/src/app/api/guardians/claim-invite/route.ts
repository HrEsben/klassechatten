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
    const { inviteCode } = body;

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Missing inviteCode' },
        { status: 400 }
      );
    }

    // Call database function to claim invite code
    const { data, error } = await supabaseAdmin.rpc('claim_guardian_invite_code', {
      p_invite_code: inviteCode,
      p_new_guardian_id: user.id,
    });

    if (error) {
      console.error('Error claiming invite code:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to claim invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
