-- =====================================================
-- Guardian Email Invitations System
-- =====================================================
-- Creates email-based invitation system for guardians
-- Replaces manual code sharing with automated emails

-- Table for storing invitation tokens and tracking status
CREATE TABLE IF NOT EXISTS public.guardian_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who sent the invitation
  inviter_guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Who is being invited (email before they sign up)
  invited_email TEXT NOT NULL,
  
  -- Which child account this invitation is for
  child_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Unique token used in email link
  invite_token TEXT NOT NULL UNIQUE,
  
  -- Invitation lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  
  -- Who accepted (if accepted)
  accepter_guardian_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT accepted_fields CHECK (
    (status = 'accepted' AND accepter_guardian_id IS NOT NULL AND accepted_at IS NOT NULL) OR
    (status != 'accepted' AND accepter_guardian_id IS NULL AND accepted_at IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guardian_invitations_token ON public.guardian_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_guardian_invitations_email ON public.guardian_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_guardian_invitations_child ON public.guardian_invitations(child_id);
CREATE INDEX IF NOT EXISTS idx_guardian_invitations_status ON public.guardian_invitations(status);

-- RLS Policies
ALTER TABLE public.guardian_invitations ENABLE ROW LEVEL SECURITY;

-- Guardians can view invitations they sent
DROP POLICY IF EXISTS "Guardians can view their sent invitations" ON public.guardian_invitations;
CREATE POLICY "Guardians can view their sent invitations"
  ON public.guardian_invitations
  FOR SELECT
  USING (auth.uid() = inviter_guardian_id);

-- Guardians can view invitations sent to their email
DROP POLICY IF EXISTS "Guardians can view invitations to their email" ON public.guardian_invitations;
CREATE POLICY "Guardians can view invitations to their email"
  ON public.guardian_invitations
  FOR SELECT
  USING (
    invited_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Guardians can create invitations for their children
DROP POLICY IF EXISTS "Guardians can create invitations for their children" ON public.guardian_invitations;
CREATE POLICY "Guardians can create invitations for their children"
  ON public.guardian_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() = inviter_guardian_id AND
    child_id IN (
      SELECT child_user_id FROM public.guardian_links WHERE guardian_user_id = auth.uid()
    )
  );

-- Guardians can update invitations they sent (to cancel)
DROP POLICY IF EXISTS "Guardians can update their sent invitations" ON public.guardian_invitations;
CREATE POLICY "Guardians can update their sent invitations"
  ON public.guardian_invitations
  FOR UPDATE
  USING (auth.uid() = inviter_guardian_id);

-- Function: Generate unique invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 32-character token
    v_token := encode(gen_random_bytes(24), 'base64');
    v_token := replace(v_token, '/', '_');
    v_token := replace(v_token, '+', '-');
    v_token := replace(v_token, '=', '');
    
    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM public.guardian_invitations WHERE invite_token = v_token
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_token;
END;
$$;

-- Function: Create guardian invitation
CREATE OR REPLACE FUNCTION create_guardian_invitation(
  p_inviter_id UUID,
  p_child_id UUID,
  p_invited_email TEXT
)
RETURNS TABLE (
  invitation_id UUID,
  invite_token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_invitation_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_child_name TEXT;
BEGIN
  -- Check if inviter_id is provided
  IF p_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify that the inviter is a guardian of this child
  IF NOT EXISTS (
    SELECT 1 FROM public.guardian_links 
    WHERE guardian_user_id = p_inviter_id AND child_user_id = p_child_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to invite guardians for this child';
  END IF;
  
  -- Check if child exists
  SELECT display_name INTO v_child_name
  FROM public.profiles
  WHERE user_id = p_child_id;
  
  IF v_child_name IS NULL THEN
    RAISE EXCEPTION 'Child account not found';
  END IF;
  
  -- Cancel any pending invitations for this child to this email
  UPDATE public.guardian_invitations
  SET status = 'cancelled', updated_at = now()
  WHERE child_id = p_child_id 
    AND invited_email = p_invited_email 
    AND status = 'pending';
  
  -- Generate unique token
  v_token := generate_invite_token();
  v_expires_at := now() + INTERVAL '7 days';
  
  -- Create the invitation
  INSERT INTO public.guardian_invitations (
    inviter_guardian_id,
    invited_email,
    child_id,
    invite_token,
    expires_at
  ) VALUES (
    p_inviter_id,
    p_invited_email,
    p_child_id,
    v_token,
    v_expires_at
  )
  RETURNING id INTO v_invitation_id;
  
  RETURN QUERY SELECT v_invitation_id, v_token, v_expires_at;
END;
$$;

-- Function: Accept guardian invitation
CREATE OR REPLACE FUNCTION accept_guardian_invitation(
  p_invite_token TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  child_id UUID,
  child_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_accepter_id UUID;
  v_invitation_id UUID;
  v_child_id UUID;
  v_child_name TEXT;
  v_inviter_id UUID;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_invited_email TEXT;
  v_accepter_email TEXT;
BEGIN
  -- Get the authenticated user
  v_accepter_id := auth.uid();
  
  IF v_accepter_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get accepter's email
  SELECT email INTO v_accepter_email
  FROM auth.users
  WHERE id = v_accepter_id;
  
  -- Get invitation details
  SELECT 
    id, guardian_invitations.child_id, status, expires_at, invited_email, inviter_guardian_id
  INTO 
    v_invitation_id, v_child_id, v_status, v_expires_at, v_invited_email, v_inviter_id
  FROM public.guardian_invitations
  WHERE invite_token = p_invite_token;
  
  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation token';
  END IF;
  
  -- Check email matches (case-insensitive)
  IF LOWER(v_accepter_email) != LOWER(v_invited_email) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;
  
  -- Check if already accepted
  IF v_status = 'accepted' THEN
    RAISE EXCEPTION 'This invitation has already been accepted';
  END IF;
  
  -- Check if expired
  IF v_status = 'expired' OR v_expires_at < now() THEN
    -- Update status if not already marked as expired
    IF v_status != 'expired' THEN
      UPDATE public.guardian_invitations
      SET status = 'expired', updated_at = now()
      WHERE id = v_invitation_id;
    END IF;
    RAISE EXCEPTION 'This invitation has expired';
  END IF;
  
  -- Check if cancelled
  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION 'This invitation has been cancelled';
  END IF;
  
  -- Check if guardian link already exists
  IF EXISTS (
    SELECT 1 FROM public.guardian_links 
    WHERE guardian_user_id = v_accepter_id AND child_user_id = v_child_id
  ) THEN
    -- Update invitation to accepted anyway
    UPDATE public.guardian_invitations
    SET 
      status = 'accepted',
      accepter_guardian_id = v_accepter_id,
      accepted_at = now(),
      updated_at = now()
    WHERE id = v_invitation_id;
    
    -- Get child name
    SELECT display_name INTO v_child_name FROM public.profiles WHERE user_id = v_child_id;
    
    RETURN QUERY SELECT TRUE, v_child_id, v_child_name;
    RETURN;
  END IF;
  
  -- Create the guardian link
  INSERT INTO public.guardian_links (
    guardian_user_id,
    child_user_id
  ) VALUES (
    v_accepter_id,
    v_child_id
  );
  
  -- Update invitation status
  UPDATE public.guardian_invitations
  SET 
    status = 'accepted',
    accepter_guardian_id = v_accepter_id,
    accepted_at = now(),
    updated_at = now()
  WHERE id = v_invitation_id;
  
  -- Get child name
  SELECT display_name INTO v_child_name FROM public.profiles WHERE user_id = v_child_id;
  
  RETURN QUERY SELECT TRUE, v_child_id, v_child_name;
END;
$$;

-- Function: Expire old invitations (run this periodically via cron)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.guardian_invitations
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.guardian_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_token() TO authenticated;
GRANT EXECUTE ON FUNCTION create_guardian_invitation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_guardian_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_invitations() TO authenticated;
