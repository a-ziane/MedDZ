-- PatientDZ database schema (MVP)
create extension if not exists pgcrypto;

create type public.user_role as enum ('patient', 'doctor', 'admin');
create type public.appointment_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled_by_patient',
  'cancelled_by_doctor',
  'completed'
);
create type public.queue_status as enum ('waiting', 'in_progress', 'done', 'skipped');

create table if not exists public.users (
  id uuid primary key,
  role public.user_role not null,
  full_name text not null,
  email text not null unique,
  phone text,
  language text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  national_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  specialty text,
  clinic_name text,
  wilaya text,
  city text,
  address text,
  bio text,
  languages_spoken text,
  average_consultation_minutes integer not null default 15,
  approved boolean not null default false,
  suspended boolean not null default false,
  profile_photo text,
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes integer not null default 15,
  created_at timestamptz not null default now(),
  constraint start_before_end check (start_time < end_time)
);

create table if not exists public.doctor_days_off (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  day_off date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (doctor_id, day_off)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  message_optional text,
  status public.appointment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create unique index if not exists appointments_unique_active_slot_idx
on public.appointments(doctor_id, appointment_date, appointment_time)
where status in ('pending', 'approved');

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  queue_date date not null,
  position integer not null check (position > 0),
  status public.queue_status not null default 'waiting',
  created_at timestamptz not null default now(),
  unique (doctor_id, queue_date, position)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists users_role_idx on public.users(role);
create index if not exists doctors_approved_idx on public.doctors(approved, suspended);
create index if not exists doctors_city_idx on public.doctors(city);
create index if not exists doctors_specialty_idx on public.doctors(specialty);
create index if not exists appointments_doctor_date_idx on public.appointments(doctor_id, appointment_date);
create index if not exists appointments_patient_date_idx on public.appointments(patient_id, appointment_date);
create index if not exists queue_entries_doctor_date_idx on public.queue_entries(doctor_id, queue_date);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

-- auto-create profile rows when user signs up from Supabase Auth
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role_text text;
begin
  user_role_text := coalesce(new.raw_user_meta_data->>'role', 'patient');

  insert into public.users (id, role, full_name, email, phone, language)
  values (
    new.id,
    case when user_role_text in ('patient', 'doctor', 'admin') then user_role_text::public.user_role else 'patient'::public.user_role end,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'language', 'en')
  )
  on conflict (id) do nothing;

  if user_role_text = 'doctor' then
    insert into public.doctors (
      user_id,
      specialty,
      clinic_name,
      wilaya,
      city,
      address,
      languages_spoken,
      approved
    )
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'specialty', ''),
      nullif(new.raw_user_meta_data->>'clinic_name', ''),
      nullif(new.raw_user_meta_data->>'wilaya', ''),
      nullif(new.raw_user_meta_data->>'city', ''),
      nullif(new.raw_user_meta_data->>'address', ''),
      'Arabic, French',
      false
    )
    on conflict (user_id) do nothing;
  elsif user_role_text = 'patient' then
    insert into public.patients (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

-- Row Level Security
alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.availability enable row level security;
alter table public.doctor_days_off enable row level security;
alter table public.appointments enable row level security;
alter table public.queue_entries enable row level security;
alter table public.notifications enable row level security;

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

-- users
create policy "users_select_self_or_admin" on public.users
for select using (auth.uid() = id or public.is_admin());
create policy "users_select_public_approved_doctors" on public.users
for select using (
  public.is_public_approved_doctor(users.id)
);
create policy "users_update_self_or_admin" on public.users
for update using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- patients
create policy "patients_select_own_or_admin" on public.patients
for select using (user_id = auth.uid() or public.is_admin());
create policy "patients_insert_self_or_admin" on public.patients
for insert with check (user_id = auth.uid() or public.is_admin());
create policy "patients_update_own_or_admin" on public.patients
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- doctors
create policy "doctors_public_select_approved" on public.doctors
for select using (approved = true and suspended = false or user_id = auth.uid() or public.is_admin());
create policy "doctors_insert_self_or_admin" on public.doctors
for insert with check (user_id = auth.uid() or public.is_admin());
create policy "doctors_update_self_or_admin" on public.doctors
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- availability + days off
create policy "availability_select_public" on public.availability
for select using (
  exists (
    select 1 from public.doctors d
    where d.id = doctor_id and (d.approved = true and d.suspended = false or d.user_id = auth.uid() or public.is_admin())
  )
);
create policy "availability_write_owner_or_admin" on public.availability
for all using (
  exists (
    select 1 from public.doctors d
    where d.id = doctor_id and (d.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.doctors d
    where d.id = doctor_id and (d.user_id = auth.uid() or public.is_admin())
  )
);

create policy "days_off_owner_or_admin" on public.doctor_days_off
for all using (
  exists (
    select 1 from public.doctors d
    where d.id = doctor_id and (d.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.doctors d
    where d.id = doctor_id and (d.user_id = auth.uid() or public.is_admin())
  )
);

-- appointments
create policy "appointments_select_related_or_admin" on public.appointments
for select using (
  public.is_admin()
  or exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
  or exists (select 1 from public.doctors d where d.id = doctor_id and d.user_id = auth.uid())
);
create policy "appointments_insert_patient_or_admin" on public.appointments
for insert with check (
  public.is_admin()
  or exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
);
create policy "appointments_update_related_or_admin" on public.appointments
for update using (
  public.is_admin()
  or exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
  or exists (select 1 from public.doctors d where d.id = doctor_id and d.user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
  or exists (select 1 from public.doctors d where d.id = doctor_id and d.user_id = auth.uid())
);

-- queue entries
create policy "queue_select_related_or_admin" on public.queue_entries
for select using (
  public.is_admin()
  or exists (select 1 from public.doctors d where d.id = doctor_id and d.user_id = auth.uid())
  or exists (
    select 1
    from public.appointments a
    join public.patients p on p.id = a.patient_id
    where a.id = appointment_id and p.user_id = auth.uid()
  )
);
create policy "queue_write_doctor_or_admin" on public.queue_entries
for all using (
  public.is_admin()
  or exists (select 1 from public.doctors d where d.id = doctor_id and d.user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.doctors d where d.id = doctor_id and d.user_id = auth.uid())
);

-- notifications
create policy "notifications_select_own_or_admin" on public.notifications
for select using (user_id = auth.uid() or public.is_admin());
create policy "notifications_insert_admin_or_self" on public.notifications
for insert with check (public.is_admin() or user_id = auth.uid());
create policy "notifications_update_own_or_admin" on public.notifications
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
