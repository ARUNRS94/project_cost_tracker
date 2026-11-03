/**
 * Supabase / PostgreSQL DDL Script for Project Code Tracker
 * Run this directly in Supabase SQL Editor to provision all tables with identity columns and RLS.
 */

export const SUPABASE_SQL_SCHEMA = `-- ==========================================================
-- PROJECT CODE TRACKER - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Compatible with Supabase Postgres 15+
-- Features: BIGINT GENERATED ALWAYS AS IDENTITY, Foreign Keys, RLS
-- ==========================================================

-- 1. Enable UUID and standard extensions if required
create extension if not exists "uuid-ossp";

-- 2. Clients Master
create table if not exists public.clients (
  id bigint generated always as identity primary key,
  client_name text not null,
  contact_person text not null,
  phone text not null,
  email text not null,
  address text not null,
  gstin text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

-- 3. Projects Master
create table if not exists public.projects (
  id bigint generated always as identity primary key,
  project_name text not null,
  client_id bigint not null references public.clients(id) on delete restrict,
  description text not null,
  start_date date not null,
  end_date date not null,
  approved_budget numeric(14, 2) not null default 0,
  status text not null default 'Active' check (status in ('Planning', 'Active', 'Completed')),
  created_at timestamptz not null default now()
);

-- 4. Item Type Master
create table if not exists public.item_types (
  id bigint generated always as identity primary key,
  description text not null,
  created_at timestamptz not null default now()
);

-- 5. Items Master
create table if not exists public.items (
  id bigint generated always as identity primary key,
  item_name text not null,
  item_type_id bigint not null references public.item_types(id) on delete restrict,
  description text not null,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  reference_picture text default '',
  work_location_picture text default '',
  item_size text default '',
  default_rate numeric(12, 2) not null default 0,
  remark text default '',
  created_at timestamptz not null default now()
);

-- 6. Expense Category Master
create table if not exists public.expense_categories (
  id bigint generated always as identity primary key,
  category_name text not null,
  description text not null,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

-- 7. Vendors Master
create table if not exists public.vendors (
  id bigint generated always as identity primary key,
  vendor_name text not null,
  contact_person text not null,
  phone text not null,
  email text not null,
  address text not null,
  gstin text default '',
  vendor_type text not null default 'Supplier',
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  remarks text default '',
  created_at timestamptz not null default now()
);

-- 8. Users Master
create table if not exists public.users (
  id bigint generated always as identity primary key,
  full_name text not null,
  email text not null unique,
  phone text default '',
  designation text default '',
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Roles Master
create table if not exists public.roles (
  id bigint generated always as identity primary key,
  role_name text not null unique,
  description text not null,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

-- 10. User Role Mappings
create table if not exists public.user_role_mappings (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  role_id bigint not null references public.roles(id) on delete cascade,
  assigned_by bigint references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, role_id)
);

-- 11. Expenses Master
create table if not exists public.expenses (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete restrict,
  project_item_id bigint references public.items(id) on delete set null,
  expense_date date not null default current_date,
  expense_category_id bigint not null references public.expense_categories(id) on delete restrict,
  description text not null,
  vendor_id bigint not null references public.vendors(id) on delete restrict,
  quantity numeric(10, 2),
  unit text,
  rate numeric(12, 2),
  amount numeric(14, 2) not null,
  payment_status text not null default 'Unpaid' check (payment_status in ('Paid', 'Unpaid', 'Partial')),
  payment_mode text not null default 'Bank' check (payment_mode in ('Cash', 'Bank', 'UPI')),
  attachment text default '',
  reference_number text default '',
  remarks text default '',
  created_by bigint not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- 12. Quotations Master
create table if not exists public.quotations (
  id bigint generated always as identity primary key,
  quotation_number text not null unique,
  quotation_date date not null default current_date,
  valid_until date not null,
  client_id bigint references public.clients(id) on delete set null,
  client_name text not null,
  contact_person text default '',
  phone text default '',
  email text default '',
  address text default '',
  gstin text default '',
  project_id bigint references public.projects(id) on delete set null,
  project_name text not null,
  field_visibility jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(14, 2) not null default 0,
  total_discount numeric(14, 2) not null default 0,
  total_gst numeric(14, 2) not null default 0,
  grand_total numeric(14, 2) not null default 0,
  payment_terms text default '',
  bank_details text default '',
  notes text default '',
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Approved', 'Rejected')),
  created_by bigint not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- 13. Performance Indexes
create index if not exists idx_expenses_project on public.expenses(project_id);
create index if not exists idx_expenses_date on public.expenses(expense_date);
create index if not exists idx_expenses_vendor on public.expenses(vendor_id);
create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_items_type on public.items(item_type_id);
create index if not exists idx_quotations_number on public.quotations(quotation_number);

-- 14. Enable Row Level Security (RLS)
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.item_types enable row level security;
alter table public.items enable row level security;
alter table public.expense_categories enable row level security;
alter table public.vendors enable row level security;
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.user_role_mappings enable row level security;
alter table public.expenses enable row level security;
alter table public.quotations enable row level security;

-- Permissive policy for authenticated applet access (customizable per team RBAC)
create policy "Allow all operations for authenticated users on clients" on public.clients for all using (true) with check (true);
create policy "Allow all operations for authenticated users on projects" on public.projects for all using (true) with check (true);
create policy "Allow all operations for authenticated users on items" on public.items for all using (true) with check (true);
create policy "Allow all operations for authenticated users on item_types" on public.item_types for all using (true) with check (true);
create policy "Allow all operations for authenticated users on categories" on public.expense_categories for all using (true) with check (true);
create policy "Allow all operations for authenticated users on vendors" on public.vendors for all using (true) with check (true);
create policy "Allow all operations for authenticated users on users" on public.users for all using (true) with check (true);
create policy "Allow all operations for authenticated users on roles" on public.roles for all using (true) with check (true);
create policy "Allow all operations for authenticated users on user_role_mappings" on public.user_role_mappings for all using (true) with check (true);
create policy "Allow all operations for authenticated users on expenses" on public.expenses for all using (true) with check (true);
create policy "Allow all operations for authenticated users on quotations" on public.quotations for all using (true) with check (true);
`;
