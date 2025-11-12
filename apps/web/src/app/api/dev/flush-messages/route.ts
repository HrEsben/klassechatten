import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DEV TOOL: This endpoint uses service role to bypass RLS
// Remove before production deployment
export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId is required' },
        { status: 400 }
      );
    }

    // Create admin client with service role key
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

    // Delete all messages in the room
    const { error, count } = await supabaseAdmin
      .from('messages')
      .delete({ count: 'exact' })
      .eq('room_id', roomId);

    if (error) {
      console.error('Error deleting messages:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      count: count || 0,
      message: `Deleted ${count || 0} messages from room ${roomId}`
    });
  } catch (error) {
    console.error('Error in flush-messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
