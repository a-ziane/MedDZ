-- Apply this on existing projects to fix doctor visibility in patient search
-- and remove RLS recursion causing stack depth errors.

alter table public.users enable row level security;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'
  );
end;
$$;

create or replace function public.is_public_approved_doctor(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctors d
    where d.user_id = target_user_id
      and d.approved = true
      and d.suspended = false
  );
$$;

drop policy if exists "users_select_public_approved_doctors" on public.users;
create policy "users_select_public_approved_doctors" on public.users
for select using (
  public.is_public_approved_doctor(users.id)
);
