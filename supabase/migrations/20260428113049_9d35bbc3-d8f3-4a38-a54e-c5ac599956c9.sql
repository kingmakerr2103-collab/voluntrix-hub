
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS volunteers_needed integer,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

ALTER TABLE public.opportunities ALTER COLUMN organization_id DROP NOT NULL;

DROP POLICY IF EXISTS "Org admins create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Org admins update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Org admins delete opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Creators or org admins update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Creators or org admins delete opportunities" ON public.opportunities;

CREATE POLICY "Authenticated users create opportunities"
ON public.opportunities FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id, 'admin'::org_member_role))
);

CREATE POLICY "Creators or org admins update opportunities"
ON public.opportunities FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id, 'admin'::org_member_role))
);

CREATE POLICY "Creators or org admins delete opportunities"
ON public.opportunities FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id, 'admin'::org_member_role))
);

DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;
CREATE POLICY "Authenticated insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.notify_volunteers_new_opportunity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'open' THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    SELECT p.user_id,
           'New opportunity: ' || NEW.title,
           COALESCE(NEW.purpose, NEW.description, 'A new volunteer opportunity is available.'),
           'opportunity'::notification_type,
           '/opportunities'
    FROM public.profiles p
    WHERE p.user_id <> NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_opportunity ON public.opportunities;
CREATE TRIGGER trg_notify_new_opportunity
AFTER INSERT ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.notify_volunteers_new_opportunity();

DROP POLICY IF EXISTS "Creators view their opportunity applications" ON public.applications;
CREATE POLICY "Creators view their opportunity applications"
ON public.applications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = applications.opportunity_id AND o.created_by = auth.uid()));

DROP POLICY IF EXISTS "Creators update their opportunity applications" ON public.applications;
CREATE POLICY "Creators update their opportunity applications"
ON public.applications FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = applications.opportunity_id AND o.created_by = auth.uid()));

-- Safely add tables to realtime publication only if not already members
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='applications') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.applications';
  END IF;
END$$;
