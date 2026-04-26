
-- =========================================================
-- ENUMS
-- =========================================================
create type public.urgency_level as enum ('low', 'medium', 'high', 'critical');
create type public.opportunity_status as enum ('draft', 'open', 'closed', 'completed', 'cancelled');
create type public.application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed', 'cancelled');
create type public.org_member_role as enum ('owner', 'admin', 'member');
create type public.notification_type as enum ('opportunity', 'application', 'message', 'project', 'system');

-- =========================================================
-- ORGANIZATIONS
-- =========================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  logo_url text,
  website text,
  location text,
  latitude double precision,
  longitude double precision,
  verified boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role public.org_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- helper function to check org membership/role without recursive RLS
create or replace function public.is_org_member(_user_id uuid, _org_id uuid, _min_role public.org_member_role default 'member')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = _org_id
      and user_id = _user_id
      and (
        _min_role = 'member'
        or (_min_role = 'admin' and role in ('admin','owner'))
        or (_min_role = 'owner' and role = 'owner')
      )
  )
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "Organizations are viewable by everyone"
  on public.organizations for select using (true);

create policy "Authenticated users can create organizations"
  on public.organizations for insert to authenticated
  with check (auth.uid() = created_by);

create policy "Org admins can update their organization"
  on public.organizations for update to authenticated
  using (public.is_org_member(auth.uid(), id, 'admin'));

create policy "Org owners can delete their organization"
  on public.organizations for delete to authenticated
  using (public.is_org_member(auth.uid(), id, 'owner'));

create policy "Members can view org membership"
  on public.organization_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_org_member(auth.uid(), organization_id, 'member')
  );

create policy "Org admins manage members"
  on public.organization_members for insert to authenticated
  with check (public.is_org_member(auth.uid(), organization_id, 'admin'));

create policy "Org admins update members"
  on public.organization_members for update to authenticated
  using (public.is_org_member(auth.uid(), organization_id, 'admin'));

create policy "Org admins remove members"
  on public.organization_members for delete to authenticated
  using (public.is_org_member(auth.uid(), organization_id, 'admin'));

-- auto-add creator as owner
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_organization_created
after insert on public.organizations
for each row execute function public.handle_new_organization();

create trigger update_organizations_updated_at
before update on public.organizations
for each row execute function public.update_updated_at_column();

-- =========================================================
-- OPPORTUNITIES
-- =========================================================
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null,
  title text not null,
  description text,
  category text,
  skills_required text[] not null default '{}',
  location text,
  latitude double precision,
  longitude double precision,
  urgency public.urgency_level not null default 'medium',
  status public.opportunity_status not null default 'open',
  capacity integer,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_opportunities_org on public.opportunities(organization_id);
create index idx_opportunities_status on public.opportunities(status);

alter table public.opportunities enable row level security;

create policy "Opportunities viewable by everyone"
  on public.opportunities for select using (true);

create policy "Org admins create opportunities"
  on public.opportunities for insert to authenticated
  with check (public.is_org_member(auth.uid(), organization_id, 'admin'));

create policy "Org admins update opportunities"
  on public.opportunities for update to authenticated
  using (public.is_org_member(auth.uid(), organization_id, 'admin'));

create policy "Org admins delete opportunities"
  on public.opportunities for delete to authenticated
  using (public.is_org_member(auth.uid(), organization_id, 'admin'));

create trigger update_opportunities_updated_at
before update on public.opportunities
for each row execute function public.update_updated_at_column();

-- =========================================================
-- APPLICATIONS
-- =========================================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  volunteer_id uuid not null,
  status public.application_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, volunteer_id)
);

create index idx_applications_volunteer on public.applications(volunteer_id);
create index idx_applications_opportunity on public.applications(opportunity_id);

alter table public.applications enable row level security;

create policy "Volunteers view their own applications"
  on public.applications for select to authenticated
  using (volunteer_id = auth.uid());

create policy "Org admins view their opportunity applications"
  on public.applications for select to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id
        and public.is_org_member(auth.uid(), o.organization_id, 'admin')
    )
  );

create policy "Volunteers create their own applications"
  on public.applications for insert to authenticated
  with check (volunteer_id = auth.uid());

create policy "Volunteers update their own applications"
  on public.applications for update to authenticated
  using (volunteer_id = auth.uid());

create policy "Org admins update applications for their opportunities"
  on public.applications for update to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id
        and public.is_org_member(auth.uid(), o.organization_id, 'admin')
    )
  );

create trigger update_applications_updated_at
before update on public.applications
for each row execute function public.update_updated_at_column();

-- =========================================================
-- PROJECTS
-- =========================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null,
  title text not null,
  description text,
  status public.project_status not null default 'planning',
  start_date date,
  end_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create or replace function public.is_project_member(_user_id uuid, _project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = _project_id and user_id = _user_id
  )
$$;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy "Projects viewable by everyone"
  on public.projects for select using (true);

create policy "Org admins create projects"
  on public.projects for insert to authenticated
  with check (public.is_org_member(auth.uid(), organization_id, 'admin'));

create policy "Org admins update projects"
  on public.projects for update to authenticated
  using (public.is_org_member(auth.uid(), organization_id, 'admin'));

create policy "Org admins delete projects"
  on public.projects for delete to authenticated
  using (public.is_org_member(auth.uid(), organization_id, 'admin'));

create policy "Project members visible to members and org admins"
  on public.project_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_project_member(auth.uid(), project_id)
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and public.is_org_member(auth.uid(), p.organization_id, 'admin')
    )
  );

create policy "Org admins manage project members"
  on public.project_members for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and public.is_org_member(auth.uid(), p.organization_id, 'admin')
    )
  );

create policy "Org admins update project members"
  on public.project_members for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and public.is_org_member(auth.uid(), p.organization_id, 'admin')
    )
  );

create policy "Org admins remove project members"
  on public.project_members for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and public.is_org_member(auth.uid(), p.organization_id, 'admin')
    )
  );

create trigger update_projects_updated_at
before update on public.projects
for each row execute function public.update_updated_at_column();

-- =========================================================
-- MESSAGING
-- =========================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id, created_at desc);

create or replace function public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = _conversation_id and user_id = _user_id
  )
$$;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "Participants view conversations"
  on public.conversations for select to authenticated
  using (public.is_conversation_participant(auth.uid(), id));

create policy "Authenticated users create conversations"
  on public.conversations for insert to authenticated
  with check (created_by = auth.uid());

create policy "Creator updates conversation"
  on public.conversations for update to authenticated
  using (created_by = auth.uid());

create policy "Participants view participant list"
  on public.conversation_participants for select to authenticated
  using (public.is_conversation_participant(auth.uid(), conversation_id));

create policy "Conversation creator adds participants"
  on public.conversation_participants for insert to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
    or user_id = auth.uid()
  );

create policy "Users can leave conversations"
  on public.conversation_participants for delete to authenticated
  using (user_id = auth.uid());

create policy "Participants read messages"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(auth.uid(), conversation_id));

create policy "Participants send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(auth.uid(), conversation_id)
  );

create policy "Senders delete own messages"
  on public.messages for delete to authenticated
  using (sender_id = auth.uid());

create trigger update_conversations_updated_at
before update on public.conversations
for each row execute function public.update_updated_at_column();

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  type public.notification_type not null default 'system',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users view own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid());

create policy "Users delete own notifications"
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());

create policy "System inserts notifications for any user"
  on public.notifications for insert to authenticated
  with check (true);

-- =========================================================
-- REALTIME
-- =========================================================
alter table public.messages replica identity full;
alter table public.notifications replica identity full;
alter table public.applications replica identity full;
alter table public.opportunities replica identity full;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.applications;
alter publication supabase_realtime add table public.opportunities;
