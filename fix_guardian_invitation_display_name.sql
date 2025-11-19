-- Fix guardian invitation functions to use display_name instead of username
-- Issue: All 47 profiles have NULL username, need to use display_name instead

-- Drop and recreate create_guardian_invitation function
DROP FUNCTION IF EXISTS create_guardian_invitation(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION create_guardian_invitation(
  p_inviter_id UUID,
  p_child_id UUID,
  p_invited_email TEXT
)
RETURNS TABLE (
  invitation_id UUID,
  invite_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_child_name TEXT;
  v_token TEXT;
  v_invitation_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify inviter is a guardian of the child
  IF NOT EXISTS (
    SELECT 1 FROM public.guardian_links 
    WHERE guardian_user_id = p_inviter_id AND child_user_id = p_child_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to invite guardians for this child';
  END IF;
  
  -- Check if child exists (using display_name instead of username)
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
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + INTERVAL '7 days';
  
  -- Insert invitation
  INSERT INTO public.guardian_invitations (
    inviter_guardian_id,
    invited_email,
    child_id,
    invite_token,
    status,
    expires_at
  ) VALUES (
    p_inviter_id,
    p_invited_email,
    p_child_id,
    v_token,
    'pending',
    v_expires_at
  ) RETURNING id INTO v_invitation_id;
  
  -- Return invitation details
  RETURN QUERY SELECT v_invitation_id, v_token;
END;
$$;

-- Drop and recreate accept_guardian_invitation function
DROP FUNCTION IF EXISTS accept_guardian_invitation(TEXT);

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
  v_invitation_id UUID;
  v_inviter_id UUID;
  v_invited_email TEXT;
  v_child_id UUID;
  v_child_name TEXT;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_accepter_id UUID;
  v_accepter_email TEXT;
  v_existing_link_count INT;
  v_max_guardians INT;
BEGIN
  -- Get current user
  v_accepter_id := auth.uid();
  IF v_accepter_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get accepter email
  SELECT email INTO v_accepter_email FROM auth.users WHERE id = v_accepter_id;
  
  -- Get invitation details
  SELECT id, inviter_guardian_id, invited_email, child_id, status, expires_at
  INTO v_invitation_id, v_inviter_id, v_invited_email, v_child_id, v_status, v_expires_at
  FROM public.guardian_invitations
  WHERE invite_token = p_invite_token;
  
  -- Check if invitation exists
  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation token';
  END IF;
  
  -- Check if invitation is expired
  IF v_expires_at < now() THEN
    UPDATE public.guardian_invitations
    SET status = 'expired', updated_at = now()
    WHERE id = v_invitation_id;
    
    RAISE EXCEPTION 'Invitation has expired';
  END IF;
  
  -- Check if invitation is pending
  IF v_status != 'pending' THEN
    -- Get child name (using display_name instead of username)
    SELECT display_name INTO v_child_name FROM public.profiles WHERE user_id = v_child_id;
    
    RETURN QUERY SELECT TRUE, v_child_id, v_child_name;
    RETURN;
  END IF;
  
  -- Create the guardian link
  INSERT INTO public.guardian_links (
    child_user_id,
    guardian_user_id,
    relationship,
    consent_status
  ) VALUES (
    v_child_id,
    v_accepter_id,
    'guardian',
    'granted'
  )
  ON CONFLICT (child_user_id, guardian_user_id) DO NOTHING;
  
  -- Update invitation status
  UPDATE public.guardian_invitations
  SET 
    status = 'accepted',
    accepter_guardian_id = v_accepter_id,
    accepted_at = now(),
    updated_at = now()
  WHERE id = v_invitation_id;
  
  -- Get child name (using display_name instead of username)
  SELECT display_name INTO v_child_name FROM public.profiles WHERE user_id = v_child_id;
  
  RETURN QUERY SELECT TRUE, v_child_id, v_child_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_guardian_invitation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_guardian_invitation(TEXT) TO authenticated;

-- Verification query
SELECT 
  'Total profiles:' as stat, 
  COUNT(*)::TEXT as value 
FROM profiles
UNION ALL
SELECT 
  'Profiles with username:', 
  COUNT(username)::TEXT 
FROM profiles
UNION ALL
SELECT 
  'Profiles with display_name:', 
  COUNT(display_name)::TEXT 
FROM profiles;
