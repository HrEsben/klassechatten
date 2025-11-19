import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getUserFromRequest } from '@/lib/supabase-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call database function to get children with invite codes
    const { data, error } = await supabaseAdmin.rpc('get_guardian_children_with_codes', {
      p_guardian_id: user.id,
    });

    if (error) {
      console.error('Error fetching children:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch children' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      children: data || [],
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
