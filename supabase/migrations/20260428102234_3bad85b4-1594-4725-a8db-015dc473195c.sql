-- Allow users to self-assign one of the safe roles (volunteer/organization).
-- Admin role assignment remains restricted to existing admins.

CREATE POLICY "Users self-insert volunteer or organization role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('volunteer'::public.app_role, 'organization'::public.app_role)
);

CREATE POLICY "Users self-delete volunteer or organization role"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND role IN ('volunteer'::public.app_role, 'organization'::public.app_role)
);