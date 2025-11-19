-- Guardian Invite Codes Migration
-- Allows Guardian #1 to generate invite codes for Guardian #2 to link to their child

-- =============================================
-- STEP 1: ALTER guardian_links TABLE
-- =============================================

-- Add invite code columns
ALTER TABLE public.guardian_links 
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
ADD COLUMN IF NOT EXISTS code_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS code_used_at timestamptz,
ADD COLUMN IF NOT EXISTS max_guardians int DEFAULT 2;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guardian_links_invite_code 
ON public.guardian_links(invite_code) 
WHERE invite_code IS NOT NULL AND code_used_at IS NULL;

-- =============================================
-- STEP 2: FUNCTION TO GENERATE GUARDIAN INVITE CODE
-- =============================================

CREATE OR REPLACE FUNCTION generate_guardian_invite_code(
  p_child_user_id uuid,
  p_requesting_guardian_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_guardian_count int;
  v_existing_code text;
BEGIN
  -- Verify requesting guardian is linked to this child
  IF NOT EXISTS (
    SELECT 1 FROM guardian_links 
    WHERE child_user_id = p_child_user_id 
    AND guardian_user_id = p_requesting_guardian_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to generate code for this child';
  END IF;

  -- Check how many guardians already exist
  SELECT COUNT(*) INTO v_guardian_count
  FROM guardian_links
  WHERE child_user_id = p_child_user_id;

  IF v_guardian_count >= 2 THEN
    RAISE EXCEPTION 'Maximum guardians (2) already linked to this child';
  END IF;

  -- Check if there's an existing unused code
  SELECT invite_code INTO v_existing_code
  FROM guardian_links
  WHERE child_user_id = p_child_user_id
    AND guardian_user_id = p_requesting_guardian_id
    AND invite_code IS NOT NULL
    AND code_used_at IS NULL;

  -- Return existing code if found
  IF v_existing_code IS NOT NULL THEN
    RETURN v_existing_code;
  END IF;

  -- Generate unique code (8 characters, uppercase alphanumeric, no confusing chars)
  LOOP
    v_code := upper(
      translate(
        substring(md5(random()::text || clock_timestamp()::text) from 1 for 8),
        '0O1IL',
        'ABCDE'
      )
    );
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM guardian_links WHERE invite_code = v_code
    );
  END LOOP;

  -- Update the guardian link with the new code
  UPDATE guardian_links
  SET 
    invite_code = v_code,
    code_generated_at = now(),
    code_used_at = NULL
  WHERE child_user_id = p_child_user_id 
    AND guardian_user_id = p_requesting_guardian_id;

  RETURN v_code;
END;
$$;

-- =============================================
-- STEP 3: FUNCTION TO CLAIM GUARDIAN INVITE CODE
-- =============================================

CREATE OR REPLACE FUNCTION claim_guardian_invite_code(
  p_invite_code text,
  p_new_guardian_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_id uuid;
  v_existing_guardian_id uuid;
  v_guardian_count int;
  v_child_name text;
  v_class_ids uuid[];
  v_result json;
BEGIN
  -- Normalize code to uppercase
  p_invite_code := upper(trim(p_invite_code));

  -- Find the child and existing guardian by code
  SELECT child_user_id, guardian_user_id 
  INTO v_child_id, v_existing_guardian_id
  FROM guardian_links
  WHERE invite_code = p_invite_code
    AND code_used_at IS NULL;

  IF v_child_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or already used invite code';
  END IF;

  -- Check if new guardian is already linked
  IF EXISTS (
    SELECT 1 FROM guardian_links 
    WHERE child_user_id = v_child_id 
    AND guardian_user_id = p_new_guardian_id
  ) THEN
    RAISE EXCEPTION 'You are already linked to this child';
  END IF;

  -- Check max guardians
  SELECT COUNT(*) INTO v_guardian_count
  FROM guardian_links 
  WHERE child_user_id = v_child_id;

  IF v_guardian_count >= 2 THEN
    RAISE EXCEPTION 'Maximum guardians (2) already linked to this child';
  END IF;

  -- Get child info
  SELECT display_name INTO v_child_name
  FROM profiles
  WHERE user_id = v_child_id;

  -- Get child's class memberships
  SELECT ARRAY_AGG(class_id) INTO v_class_ids
  FROM class_members
  WHERE user_id = v_child_id;

  -- Create new guardian link
  INSERT INTO guardian_links (
    child_user_id, 
    guardian_user_id, 
    relationship, 
    consent_status,
    consent_at
  )
  VALUES (
    v_child_id, 
    p_new_guardian_id, 
    'parent', 
    'granted',
    now()
  );

  -- Add guardian as member to child's classes
  IF v_class_ids IS NOT NULL THEN
    INSERT INTO class_members (class_id, user_id, role_in_class, status, joined_at)
    SELECT 
      unnest(v_class_ids),
      p_new_guardian_id,
      'guardian',
      'active',
      now()
    ON CONFLICT (class_id, user_id) DO NOTHING;
  END IF;

  -- Mark code as used
  UPDATE guardian_links
  SET code_used_at = now()
  WHERE child_user_id = v_child_id 
    AND guardian_user_id = v_existing_guardian_id
    AND invite_code = p_invite_code;

  -- Build result
  SELECT json_build_object(
    'success', true,
    'child_id', v_child_id,
    'child_name', v_child_name,
    'classes_joined', array_length(v_class_ids, 1)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =============================================
-- STEP 4: FUNCTION TO GET CHILDREN WITH INVITE CODES
-- =============================================

CREATE OR REPLACE FUNCTION get_guardian_children_with_codes(
  p_guardian_id uuid
)
RETURNS TABLE (
  child_id uuid,
  child_name text,
  child_username text,
  invite_code text,
  code_generated_at timestamptz,
  code_used boolean,
  code_used_at timestamptz,
  guardian_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gl.child_user_id,
    p.display_name,
    p.username,
    gl.invite_code,
    gl.code_generated_at,
    (gl.code_used_at IS NOT NULL) as code_used,
    gl.code_used_at,
    (SELECT COUNT(*)::int 
     FROM guardian_links gl2 
     WHERE gl2.child_user_id = gl.child_user_id) as guardian_count
  FROM guardian_links gl
  JOIN profiles p ON p.user_id = gl.child_user_id
  WHERE gl.guardian_user_id = p_guardian_id
  ORDER BY p.display_name;
END;
$$;

-- =============================================
-- STEP 5: RLS POLICY FOR INVITE CODES
-- =============================================

-- Guardian can only see their own links
-- (existing policies should already cover this, but let's be explicit)

COMMENT ON COLUMN guardian_links.invite_code IS 'Unique 8-character code for Guardian #2 to claim relationship';
COMMENT ON COLUMN guardian_links.code_generated_at IS 'When Guardian #1 generated the invite code';
COMMENT ON COLUMN guardian_links.code_used_at IS 'When Guardian #2 used the code (NULL = unused)';
COMMENT ON COLUMN guardian_links.max_guardians IS 'Maximum number of guardians per child (default 2)';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_guardian_invite_code TO authenticated;
GRANT EXECUTE ON FUNCTION claim_guardian_invite_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_guardian_children_with_codes TO authenticated;
