-- Step 1: Drop the old constraint
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Add new constraint with 'admin' included
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('child', 'guardian', 'adult', 'admin'));

-- Step 3: Check current role for esben@optus.dk
SELECT 
  p.user_id,
  u.email,
  p.role,
  p.display_name
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'esben@optus.dk';

-- Step 4: Update to admin
UPDATE public.profiles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'esben@optus.dk');

-- Step 5: Verify the update worked
SELECT 
  p.user_id,
  u.email,
  p.role,
  p.display_name
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'esben@optus.dk';
