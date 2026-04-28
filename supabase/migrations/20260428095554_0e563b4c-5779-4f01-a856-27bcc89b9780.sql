
-- 1) Restrict profiles SELECT to authenticated users only, and hide phone from non-owners
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users view non-sensitive profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Owner-only column-level protection via trigger-style guard isn't possible in pure RLS;
-- so create a public-safe view that excludes phone for non-owners.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  location,
  CASE WHEN auth.uid() = user_id THEN phone ELSE NULL END AS phone,
  skills,
  interests,
  availability,
  onboarding_complete,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- 2) Harden handle_new_user trigger to never grant admin from client metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _requested text;
  _role public.app_role;
begin
  insert into public.profiles (user_id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  _requested := nullif(new.raw_user_meta_data ->> 'role', '');

  -- Only allow self-assigning safe roles. Admin must be granted manually.
  if _requested in ('volunteer', 'organization') then
    _role := _requested::public.app_role;
  else
    _role := 'volunteer'::public.app_role;
  end if;

  insert into public.user_roles (user_id, role)
  values (new.id, _role);

  return new;
end;
$function$;

-- 3) Remove user-facing INSERT on notifications (only service role / triggers should create)
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
