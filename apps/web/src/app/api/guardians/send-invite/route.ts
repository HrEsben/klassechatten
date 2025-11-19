import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendGuardianInvite } from '@/lib/email';
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
    const { childId, invitedEmail } = body;

    if (!childId || !invitedEmail) {
      return NextResponse.json(
        { error: 'Child ID og email er påkrævet' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invitedEmail)) {
      return NextResponse.json(
        { error: 'Ugyldig email-adresse' },
        { status: 400 }
      );
    }

    // Check that user cannot invite themselves
    if (user.email?.toLowerCase() === invitedEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Du kan ikke invitere dig selv' },
        { status: 400 }
      );
    }

    // Get child info
    const { data: childProfile, error: childError } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('user_id', childId)
      .single();

    if (childError || !childProfile) {
      return NextResponse.json(
        { error: 'Barn-konto ikke fundet' },
        { status: 404 }
      );
    }

    // Get inviter name
    const { data: inviterProfile, error: inviterError } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    if (inviterError || !inviterProfile) {
      return NextResponse.json(
        { error: 'Bruger ikke fundet' },
        { status: 404 }
      );
    }

    // Check if invited user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', invitedEmail.toLowerCase())
      .single();

    // Create invitation using database function
    const { data: invitationData, error: inviteError } = await supabaseAdmin
      .rpc('create_guardian_invitation', {
        p_inviter_id: user.id,
        p_child_id: childId,
        p_invited_email: invitedEmail.toLowerCase(),
      });

    if (inviteError) {
      console.error('[API] Error creating invitation:', inviteError);
      return NextResponse.json(
        { error: inviteError.message || 'Kunne ikke oprette invitation' },
        { status: 500 }
      );
    }

    const invitation = invitationData?.[0];
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation blev ikke oprettet' },
        { status: 500 }
      );
    }

    // Send email
    try {
      await sendGuardianInvite({
        toEmail: invitedEmail,
        childName: childProfile.display_name,
        inviterName: inviterProfile.display_name,
        inviteToken: invitation.invite_token,
      });
    } catch (emailError) {
      console.error('[API] Error sending email:', emailError);
      // Invitation was created but email failed - log but don't fail the request
      // The user can try to resend later
      return NextResponse.json(
        { 
          error: 'Invitation blev oprettet, men email kunne ikke sendes. Prøv igen senere.',
          invitationId: invitation.invitation_id,
        },
        { status: 207 } // Multi-Status
      );
    }

    // If user already exists, also send an in-app notification
    if (existingUser) {
      try {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: existingUser.id,
            type: 'system',
            title: 'Ny forældre-invitation',
            body: `${inviterProfile.display_name} har inviteret dig til at være forælder for ${childProfile.display_name}. Tjek din email for at acceptere.`,
            data: {
              invitation_id: invitation.invitation_id,
              child_id: childId,
              child_name: childProfile.display_name,
              inviter_name: inviterProfile.display_name,
              invite_token: invitation.invite_token,
            },
            idempotency_key: `guardian_invite_${invitation.invitation_id}`,
          });
        
        console.log('[API] In-app notification sent to existing user:', existingUser.id);
      } catch (notifError) {
        console.error('[API] Error creating in-app notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      invitationId: invitation.invitation_id,
      expiresAt: invitation.expires_at,
      message: `Invitation sendt til ${invitedEmail}${existingUser ? ' (brugeren har også modtaget en notifikation i appen)' : ''}`,
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Der opstod en fejl' },
      { status: 500 }
    );
  }
}
