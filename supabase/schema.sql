-- ResQmate / DocIT database. Run once in the Supabase SQL editor.
-- Tables and columns match what the app reads and writes (src/, services/).
-- Patients and doctors both sign in with Supabase Auth (email + password).

create extension if not exists pgcrypto;

-- Patients
create table if not exists public.users (
  email text primary key,
  name text,
  phone text,
  age text,
  height text,
  weight text,
  connected_doctors uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Doctors
create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  specialty text,
  qualification text,
  experience text,
  hospital text,
  bio text,
  connected_patients text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Latest wearable reading per patient (upserted by services/SensorData.ts)
create table if not exists public.health_data (
  patient_email text primary key references public.users(email) on delete cascade,
  heart_rate text,
  blood_oxygen text,
  motion_state text,
  last_updated text,
  raw_data jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  doctor_name text,
  doctor_email text not null,
  patient_email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Doctor <-> patient messages and SOS alerts
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  from_email text not null,
  to_email text not null,
  from_type text not null check (from_type in ('patient', 'doctor')),
  to_type text not null check (to_type in ('patient', 'doctor')),
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Diagnostic history
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  patient_email text not null,
  title text,
  description text,
  date text,
  doctor text,
  medication text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.my_email() returns text
language sql stable as $$ select lower(auth.jwt() ->> 'email') $$;

-- Is the signed-in doctor connected to this patient?
create or replace function public.is_my_patient(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from doctors d
    where lower(d.email) = public.my_email() and p_email = any(d.connected_patients)
  )
$$;

-- Doctor search by exact email (ConnectPatient.tsx). Returns only name + email.
create or replace function public.find_patient_by_email(p_email text)
returns table (email text, name text)
language sql stable security definer set search_path = public as $$
  select u.email, u.name from users u
  where lower(u.email) = lower(trim(p_email))
    and exists (select 1 from doctors d where lower(d.email) = public.my_email())
$$;

-- Patient accepts/declines a doctor's request (Dashboard.tsx): links both sides
create or replace function public.respond_to_connection_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  req connection_requests%rowtype;
begin
  select * into req from connection_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;
  if lower(req.patient_email) <> public.my_email() then
    raise exception 'Not your request';
  end if;

  if p_accept then
    update users
      set connected_doctors = array(select distinct unnest(connected_doctors || req.doctor_id))
      where email = req.patient_email;
    update doctors
      set connected_patients = array(select distinct unnest(connected_patients || req.patient_email))
      where id = req.doctor_id;
  end if;

  delete from connection_requests where id = p_request_id;
end
$$;

grant execute on function public.find_patient_by_email(text) to authenticated;
grant execute on function public.respond_to_connection_request(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.doctors enable row level security;
alter table public.health_data enable row level security;
alter table public.connection_requests enable row level security;
alter table public.messages enable row level security;
alter table public.history enable row level security;

drop policy if exists users_self on public.users;
create policy users_self on public.users for all
  using (lower(email) = public.my_email()) with check (lower(email) = public.my_email());
drop policy if exists users_doctor_read on public.users;
create policy users_doctor_read on public.users for select using (public.is_my_patient(email));

drop policy if exists doctors_self on public.doctors;
create policy doctors_self on public.doctors for all
  using (lower(email) = public.my_email()) with check (lower(email) = public.my_email());
-- Patients need doctor emails for SOS alerts and request cards
drop policy if exists doctors_read on public.doctors;
create policy doctors_read on public.doctors for select to authenticated using (true);

drop policy if exists health_self on public.health_data;
create policy health_self on public.health_data for all
  using (lower(patient_email) = public.my_email()) with check (lower(patient_email) = public.my_email());
drop policy if exists health_doctor_read on public.health_data;
create policy health_doctor_read on public.health_data for select using (public.is_my_patient(patient_email));

drop policy if exists requests_doctor on public.connection_requests;
create policy requests_doctor on public.connection_requests for all
  using (lower(doctor_email) = public.my_email()) with check (lower(doctor_email) = public.my_email());
drop policy if exists requests_patient_read on public.connection_requests;
create policy requests_patient_read on public.connection_requests for select
  using (lower(patient_email) = public.my_email());

drop policy if exists messages_participants on public.messages;
create policy messages_participants on public.messages for select
  using (public.my_email() in (lower(from_email), lower(to_email)));
drop policy if exists messages_send on public.messages;
create policy messages_send on public.messages for insert with check (lower(from_email) = public.my_email());
drop policy if exists messages_mark_read on public.messages;
create policy messages_mark_read on public.messages for update
  using (lower(to_email) = public.my_email());

drop policy if exists history_self on public.history;
create policy history_self on public.history for all
  using (lower(patient_email) = public.my_email()) with check (lower(patient_email) = public.my_email());
drop policy if exists history_doctor_read on public.history;
create policy history_doctor_read on public.history for select using (public.is_my_patient(patient_email));

-- Realtime feeds used by the dashboards
do $$ begin
  alter publication supabase_realtime add table public.health_data;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.connection_requests;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
