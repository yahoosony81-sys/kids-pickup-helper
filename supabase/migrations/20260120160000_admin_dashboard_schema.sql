-- ============================================================================
-- Admin Dashboard Schema Updates
-- 1. provider_documents table
-- 2. profiles columns (school_name, role)
-- ============================================================================

-- 1. Create document_status ENUM
do $$ begin
  create type document_status as enum (
    'PENDING',
    'APPROVED',
    'REJECTED'
  );
exception
  when duplicate_object then null;
end $$;

-- 2. Create provider_documents table
create table if not exists public.provider_documents (
  id uuid default gen_random_uuid() primary key,
  provider_profile_id uuid not null references public.profiles(id) on delete restrict,
  document_type text not null,
  file_path text not null,
  status document_status not null default 'PENDING',
  rejection_reason text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.provider_documents is '제공자 인증 서류. 관리자 승인 필요.';

-- Add updated_at trigger (if function exists)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'handle_updated_at') then
    if not exists (
      select 1 from pg_trigger where tgname = 'set_updated_at_on_provider_documents'
    ) then
      create trigger set_updated_at_on_provider_documents
        before update on public.provider_documents
        for each row
        execute function public.handle_updated_at();
    end if;
  end if;
end $$;

-- Add indexes
create index if not exists idx_provider_documents_provider on public.provider_documents(provider_profile_id);
create index if not exists idx_provider_documents_status on public.provider_documents(status);

-- 3. Add columns to profiles table
alter table public.profiles 
add column if not exists school_name text,
add column if not exists role text default 'USER';

comment on column public.profiles.school_name is '자녀 학교명 (통계용)';
comment on column public.profiles.role is '사용자 권한 (USER, ADMIN)';

-- 4. Disable RLS for provider_documents (matching current dev pattern)
alter table public.provider_documents disable row level security;
grant all on table public.provider_documents to anon;
grant all on table public.provider_documents to authenticated;
grant all on table public.provider_documents to service_role;
