import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const short = url.searchParams.get('short');

    if (!short || short.length < 8) {
      return NextResponse.json({ error: 'Missing or too-short identifier' }, { status: 400 });
    }

    // Try to find a class whose id starts with the provided short string
    // Use PostgreSQL LIKE to match prefix
    const { data, error } = await supabaseAdmin
      .from('classes')
      .select('id')
      .like('id', `${short}%`)
      .limit(1);

    if (error) {
      console.error('Error resolving short id:', error);
      return NextResponse.json({ error: 'Failed to resolve id' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ id: data[0].id });
  } catch (err) {
    console.error('Unexpected error in resolve route:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
