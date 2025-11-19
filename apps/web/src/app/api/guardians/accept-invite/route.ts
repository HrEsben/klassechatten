import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getUserFromRequest } from '@/lib/supabase-auth';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Ikke autoriseret' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { inviteToken } = body;

    if (!inviteToken) {
      return NextResponse.json(
        { error: 'Invitation token er påkrævet' },
        { status: 400 }
      );
    }

    // Accept invitation using database function
    const { data: result, error: acceptError } = await supabaseAdmin
      .rpc('accept_guardian_invitation', {
        p_invite_token: inviteToken,
      });

    if (acceptError) {
      console.error('[API] Error accepting invitation:', acceptError);
      
      // Handle specific error messages
      const errorMessage = acceptError.message;
      if (errorMessage.includes('Invalid invitation token')) {
        return NextResponse.json(
          { error: 'Ugyldig invitation' },
          { status: 404 }
        );
      } else if (errorMessage.includes('different email address')) {
        return NextResponse.json(
          { error: 'Denne invitation blev sendt til en anden email-adresse' },
          { status: 403 }
        );
      } else if (errorMessage.includes('already been accepted')) {
        return NextResponse.json(
          { error: 'Denne invitation er allerede blevet accepteret' },
          { status: 409 }
        );
      } else if (errorMessage.includes('expired')) {
        return NextResponse.json(
          { error: 'Denne invitation er udløbet' },
          { status: 410 }
        );
      } else if (errorMessage.includes('cancelled')) {
        return NextResponse.json(
          { error: 'Denne invitation er blevet annulleret' },
          { status: 410 }
        );
      }
      
      return NextResponse.json(
        { error: 'Kunne ikke acceptere invitation' },
        { status: 500 }
      );
    }

    const acceptResult = result?.[0];
    if (!acceptResult || !acceptResult.success) {
      return NextResponse.json(
        { error: 'Invitation blev ikke accepteret' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      childId: acceptResult.child_id,
      childName: acceptResult.child_name,
      message: `Du er nu tilknyttet ${acceptResult.child_name}`,
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Der opstod en fejl' },
      { status: 500 }
    );
  }
}
