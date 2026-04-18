-- Seed data for PatientDZ MVP
-- Run after schema.sql in Supabase SQL Editor

-- Recreate deterministic sample records
truncate table public.queue_entries restart identity cascade;
truncate table public.appointments restart identity cascade;
truncate table public.availability restart identity cascade;
truncate table public.doctor_days_off restart identity cascade;
truncate table public.doctors restart identity cascade;
truncate table public.patients restart identity cascade;
truncate table public.notifications restart identity cascade;
truncate table public.users restart identity cascade;

-- 10 doctors + 30 patients + 1 admin users
insert into public.users (id, role, full_name, email, phone, language)
select gen_random_uuid(), 'doctor', 'Doctor ' || i, 'doctor' || i || '@patientdz.com', '+213770000' || lpad(i::text, 2, '0'), 'fr'
from generate_series(1, 10) i;

insert into public.users (id, role, full_name, email, phone, language)
select gen_random_uuid(), 'patient', 'Patient ' || i, 'patient' || i || '@patientdz.com', '+213550000' || lpad(i::text, 2, '0'), 'en'
from generate_series(1, 30) i;

insert into public.users (id, role, full_name, email, phone, language)
values (gen_random_uuid(), 'admin', 'Admin User', 'admin@patientdz.com', '+213661111111', 'en');

insert into public.doctors (
  user_id,
  specialty,
  clinic_name,
  wilaya,
  city,
  address,
  bio,
  languages_spoken,
  average_consultation_minutes,
  approved,
  suspended,
  profile_photo
)
select
  u.id,
  (array['General Medicine','Cardiology','Dermatology','Pediatrics','Gynecology','Orthopedics','ENT','Neurology','Dentistry','Ophthalmology'])[n],
  'Clinic ' || n,
  (array['Algiers','Oran','Constantine','Blida','Setif','Annaba','Tlemcen','Tizi Ouzou','Bejaia','Batna'])[n],
  (array['Algiers','Oran','Constantine','Blida','Setif','Annaba','Tlemcen','Tizi Ouzou','Bejaia','Batna'])[n],
  'Street ' || n || ', Algeria',
  'Experienced doctor focused on patient comfort and efficient visits.',
  'Arabic, French',
  10 + n,
  case when n <= 8 then true else false end,
  false,
  null
from (
  select id, row_number() over(order by created_at asc) as n
  from public.users
  where role = 'doctor'
) u;

insert into public.patients (user_id, national_id)
select id, 'NID-' || row_number() over(order by created_at asc)
from public.users
where role = 'patient';

-- availability for all doctors
insert into public.availability (doctor_id, weekday, start_time, end_time, slot_minutes)
select d.id, w.weekday, '09:00'::time, '16:00'::time, 15
from public.doctors d
cross join (values (0),(1),(2),(3),(4)) as w(weekday);

-- create sample appointments (approved + pending + completed)
insert into public.appointments (patient_id, doctor_id, appointment_date, appointment_time, message_optional, status)
select
  p.id,
  d.id,
  (current_date + ((n % 5) - 1)),
  (time '09:00' + ((n % 16) * interval '15 minute'))::time,
  'Follow-up visit',
  (array['approved','pending','completed','approved','pending'])[1 + (n % 5)]::public.appointment_status
from generate_series(1, 50) n
join lateral (select id from public.patients order by random() limit 1) p on true
join lateral (select id from public.doctors where approved = true order by random() limit 1) d on true;

-- sample queue from today's approved appointments
insert into public.queue_entries (doctor_id, appointment_id, queue_date, position, status)
select
  a.doctor_id,
  a.id,
  current_date,
  row_number() over(partition by a.doctor_id order by a.appointment_time),
  (array['waiting','in_progress','done','waiting'])[1 + (abs(mod(extract(epoch from a.created_at)::int, 4)))]::public.queue_status
from public.appointments a
where a.appointment_date = current_date
  and a.status = 'approved'
limit 20;

-- sample notifications
insert into public.notifications (user_id, title, body, read)
select
  u.id,
  'Welcome to PatientDZ',
  'Your account is ready. You can now book and track appointments.',
  false
from public.users u
limit 20;
