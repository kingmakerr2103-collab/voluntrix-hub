
drop policy if exists "System inserts notifications for any user" on public.notifications;

create policy "Users insert own notifications"
  on public.notifications for insert to authenticated
  with check (user_id = auth.uid());
