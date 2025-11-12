import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, userId: _userId, roomId: _roomId, type } = body;

    // Validate that we have required auth  
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const revalidated: string[] = [];

    // Handle path revalidation
    if (path) {
      revalidatePath(path);
      revalidated.push(`path:${path}`);
    }

    // Revalidate common paths based on type
    switch (type) {
      case 'user-classes':
        revalidatePath('/');
        revalidated.push('path:/');
        break;
      
      case 'room-messages':
        revalidatePath('/');
        revalidated.push('path:/');
        break;
      
      case 'user-profile':
        revalidatePath('/');
        revalidated.push('path:/');
        break;
      
      case 'rooms':
        revalidatePath('/');
        revalidated.push('path:/');
        break;
    }

    return NextResponse.json({ 
      revalidated: true,
      items: revalidated,
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    console.error('Cache revalidation error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}