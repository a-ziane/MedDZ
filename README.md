# PatientDZ MVP (Algeria)

PatientDZ is a simple, polished startup MVP to connect patients and doctors in Algeria, reduce waiting time, and support appointment booking with queue tracking.

## Stack
- Next.js (App Router, full stack)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + Storage-ready)
- Vercel (deployment)

## Features
- Route-based apps in one project:
  - `/patient`
  - `/doctor`
  - `/admin`
- Supabase Auth (email/password) for patients and doctors
- Admin-only dashboard with doctor approval workflow
- Role-based middleware + server-side role checks
- Doctor search, booking, approvals/rejections, queue tracking
- Live patient queue page (auto refresh every 30s)
- In-app notifications
- English/French/Arabic language switcher with RTL support for Arabic
- Dark mode toggle

## Quick Start
1. Install dependencies:
```bash
npm install
```

2. Create env file:
```bash
cp .env.example .env.local
```

3. Fill env values in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

4. In Supabase SQL editor, run:
- `supabase/schema.sql`
- `supabase/seed.sql`

5. Start dev server:
```bash
npm run dev
```

## Authentication + Roles
- Patients: signup/login from `/auth/signup`, `/auth/login`
- Doctors: signup/login from `/auth/signup`, `/auth/login`
- Admins: manually seeded in DB (`users.role = 'admin'`)

A DB trigger (`handle_auth_user_created`) creates `public.users` and doctor/patient rows automatically when a new auth user is created.

## Security Notes
- Middleware guards protected routes (`/patient`, `/doctor`, `/admin`)
- Server actions enforce role checks (`requireRole`)
- RLS enabled on all core tables with role-aware policies
- Double booking prevented by both server checks and unique partial index

## Deployment (Vercel)
1. Push repo to GitHub.
2. Import project in Vercel.
3. Set all environment variables from `.env.example`.
4. Deploy.

Optional reminder cron:
- Endpoint: `GET /api/cron/reminders`
- Header: `Authorization: Bearer <CRON_SECRET>`
- Add a Vercel Cron Job hitting this endpoint daily.

## Project Structure
```text
src/
  app/
    auth/
    patient/
    doctor/
    admin/
    api/
  components/
  lib/
supabase/
  schema.sql
  seed.sql
```

## MVP Scope Notes
- Email notifications are prepared as optional; in-app notifications are active.
- Doctor ratings are left as a placeholder for next iteration.
- `doctor_days_off` table is included for day-off support and can be wired in UI next.
