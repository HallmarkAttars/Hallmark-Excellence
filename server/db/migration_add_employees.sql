-- ==========================================================================
-- EMPLOYEE / USER MANAGEMENT SUPPORT
-- --------------------------------------------------------------------------
-- The live `users` table already carries the columns the Admin Employees
-- module needs (first_name, last_name, email, phone, password_hash, role,
-- is_active, last_login, created_at, updated_at). This migration is
-- idempotent — it only adds anything a fresh environment might be missing
-- and hardens Row Level Security.
--
-- Security: the users table holds internal staff accounts. It must NEVER be
-- readable/writable by anon browser clients — only this server (service-role
-- key) touches it. Enabling RLS with ZERO policies denies anon + authenticated
-- roles completely, exactly like orders / admin_users already behave.
-- ==========================================================================

-- --- Columns (no-ops where already present) -------------------------------
alter table users add column if not exists first_name text default '';
alter table users add column if not exists last_name text default '';
alter table users add column if not exists phone text default '';
alter table users add column if not exists role text default 'staff';
alter table users add column if not exists is_active boolean default true;
alter table users add column if not exists last_login timestamptz;

-- --- Roles ------------------------------------------------------------------
-- CRITICAL: the live users table was created with a CHECK constraint that
-- ONLY accepts 'admin' (users_role_check). The Employee Management module
-- adds MANAGER and STAFF roles, so the constraint must be relaxed. Run this
-- against your Supabase project before creating non-admin employees:
--
--   alter table users drop constraint users_role_check;
--   alter table users add constraint users_role_check check (role in ('admin', 'manager', 'staff'));
--
-- (Both statements are included below so the whole file is safe to run once.)
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('admin', 'manager', 'staff'));

-- --- Row Level Security -----------------------------------------------------
alter table users enable row level security;

-- Deliberately NO policies on users: with RLS on and zero policies, the anon
-- and authenticated roles are denied every operation. Only the service-role
-- backend (server/src/config/supabase.js) can read or write this table.

-- Helpful index for the Admin Employees list (newest first).
create index if not exists idx_users_created_at on users (created_at desc);
create index if not exists idx_users_role on users (role);
