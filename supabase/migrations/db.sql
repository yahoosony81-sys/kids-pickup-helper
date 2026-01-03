-- ============================================================================
-- 우리아이 픽업이모 MVP v1.0 - 데이터베이스 스키마 생성 (충돌/경고 최소화 버전)
-- ============================================================================
-- 변경 사항:
-- 1) public.users FK 제거 (users 테이블 없을 수 있으므로)
-- 2) DROP TRIGGER 제거 (Supabase destructive 경고 방지)
-- 3) gen_random_uuid() 사용을 위해 pgcrypto 확장 보장
-- ============================================================================

-- ============================================================================
-- 0. Extensions
-- ============================================================================
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. ENUM 타입 정의 (중복 실행 안전)
-- ============================================================================
do $$ begin
  create type request_status as enum (
    'REQUESTED',
    'MATCHED',
    'IN_PROGRESS',
    'ARRIVED',
    'COMPLETED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type trip_status as enum (
    'OPEN',
    'IN_PROGRESS',
    'ARRIVED',
    'COMPLETED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type invitation_status as enum (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED'
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================================
-- 2. profiles 테이블 (학부모 프로필)
-- ============================================================================
-- ✅ users FK 제거: Clerk 기준으로만 연결 (clerk_user_id)
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  clerk_user_id text not null unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.profiles is '학부모 프로필 정보. Clerk 인증과 연동됨.';

-- updated_at 자동 업데이트 트리거 함수
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ✅ DROP TRIGGER 제거: 존재 여부 확인 후 없으면 생성 (destructive 경고 방지)
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_updated_at_on_profiles'
  ) then
    create trigger set_updated_at_on_profiles
      before update on public.profiles
      for each row
      execute function public.handle_updated_at();
  end if;
end $$;

-- 인덱스
create index if not exists idx_profiles_clerk_user_id on public.profiles(clerk_user_id);

-- ============================================================================
-- 3. pickup_requests 테이블 (픽업 요청서)
-- ============================================================================
create table if not exists public.pickup_requests (
  id uuid default gen_random_uuid() primary key,
  requester_profile_id uuid not null references public.profiles(id) on delete restrict,
  pickup_time timestamptz not null,

  origin_text text not null,
  origin_lat numeric(10, 8) not null,
  origin_lng numeric(11, 8) not null,

  destination_text text not null,
  destination_lat numeric(10, 8) not null,
  destination_lng numeric(11, 8) not null,

  status request_status not null default 'REQUESTED',

  cancel_reason_code text check (cancel_reason_code in ('CANCEL', 'NO_SHOW')),
  cancel_reason_text text,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.pickup_requests is '픽업 요청서. 요청자가 등록한 픽업 요청 정보를 저장.';

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_on_pickup_requests'
  ) then
    create trigger set_updated_at_on_pickup_requests
      before update on public.pickup_requests
      for each row
      execute function public.handle_updated_at();
  end if;
end $$;

create index if not exists idx_pickup_requests_requester_time
  on public.pickup_requests(requester_profile_id, pickup_time);

create index if not exists idx_pickup_requests_status
  on public.pickup_requests(status);

-- ============================================================================
-- 4. trips 테이블 (픽업 세션)
-- ============================================================================
create table if not exists public.trips (
  id uuid default gen_random_uuid() primary key,
  provider_profile_id uuid not null references public.profiles(id) on delete restrict,

  capacity int not null default 3 check (capacity > 0),
  is_locked boolean not null default false,

  status trip_status not null default 'OPEN',

  start_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.trips is '픽업 세션. 제공자의 1회 출발 단위. 최대 3명 수용.';

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_on_trips'
  ) then
    create trigger set_updated_at_on_trips
      before update on public.trips
      for each row
      execute function public.handle_updated_at();
  end if;
end $$;

create index if not exists idx_trips_provider on public.trips(provider_profile_id);
create index if not exists idx_trips_status on public.trips(status);
create index if not exists idx_trips_locked on public.trips(is_locked) where is_locked = false;

-- ============================================================================
-- 5. invitations 테이블 (초대)
-- ============================================================================
create table if not exists public.invitations (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid not null references public.trips(id) on delete restrict,
  pickup_request_id uuid not null references public.pickup_requests(id) on delete restrict,
  provider_profile_id uuid not null references public.profiles(id) on delete restrict,
  requester_profile_id uuid not null references public.profiles(id) on delete restrict,

  status invitation_status not null default 'PENDING',
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz default now() not null
);

comment on table public.invitations is '픽업 초대. 제공자가 요청자에게 보내는 초대 단위.';

create index if not exists idx_invitations_trip on public.invitations(trip_id);
create index if not exists idx_invitations_request on public.invitations(pickup_request_id);
create index if not exists idx_invitations_requester on public.invitations(requester_profile_id);
create index if not exists idx_invitations_status on public.invitations(status);
create index if not exists idx_invitations_expires on public.invitations(expires_at) where status = 'PENDING';

-- 요청자는 동시에 PENDING 초대 1개만 허용
create unique index if not exists idx_invitations_unique_pending_requester
  on public.invitations(requester_profile_id)
  where status = 'PENDING';

-- ============================================================================
-- 6. trip_participants 테이블 (Trip 참여자 매핑)
-- ============================================================================
create table if not exists public.trip_participants (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid not null references public.trips(id) on delete restrict,
  pickup_request_id uuid not null references public.pickup_requests(id) on delete restrict,
  requester_profile_id uuid not null references public.profiles(id) on delete restrict,

  sequence_order int,
  created_at timestamptz default now() not null
);

comment on table public.trip_participants is 'Trip 참여자 매핑. Trip에 포함된 요청자 목록 관리.';

create index if not exists idx_trip_participants_trip on public.trip_participants(trip_id);
create index if not exists idx_trip_participants_request on public.trip_participants(pickup_request_id);
create index if not exists idx_trip_participants_requester on public.trip_participants(requester_profile_id);

-- pickup_request는 하나의 Trip에만 포함 가능
create unique index if not exists idx_trip_participants_unique_request
  on public.trip_participants(pickup_request_id);

-- ============================================================================
-- 7. trip_arrivals 테이블 (도착 인증)
-- ============================================================================
create table if not exists public.trip_arrivals (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid not null references public.trips(id) on delete restrict,
  pickup_request_id uuid not null references public.pickup_requests(id) on delete restrict,

  photo_path text not null,
  created_at timestamptz default now() not null
);

comment on table public.trip_arrivals is '도착 인증. 도착 후 업로드된 사진 정보.';

create index if not exists idx_trip_arrivals_trip on public.trip_arrivals(trip_id);
create index if not exists idx_trip_arrivals_request on public.trip_arrivals(pickup_request_id);

-- ============================================================================
-- 8. trip_reviews 테이블 (평가)
-- ============================================================================
create table if not exists public.trip_reviews (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid not null references public.trips(id) on delete restrict,
  pickup_request_id uuid not null references public.pickup_requests(id) on delete restrict,
  reviewer_profile_id uuid not null references public.profiles(id) on delete restrict,
  provider_profile_id uuid not null references public.profiles(id) on delete restrict,

  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now() not null
);

comment on table public.trip_reviews is '픽업 평가. 요청자가 제공자에 대한 평가 정보.';

create index if not exists idx_trip_reviews_trip on public.trip_reviews(trip_id);
create index if not exists idx_trip_reviews_request on public.trip_reviews(pickup_request_id);
create index if not exists idx_trip_reviews_provider on public.trip_reviews(provider_profile_id);
create index if not exists idx_trip_reviews_reviewer on public.trip_reviews(reviewer_profile_id);

-- ============================================================================
-- 9. RLS 비활성화 + 권한 (개발용)
-- ============================================================================
alter table public.profiles disable row level security;
grant all on table public.profiles to anon;
grant all on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

alter table public.pickup_requests disable row level security;
grant all on table public.pickup_requests to anon;
grant all on table public.pickup_requests to authenticated;
grant all on table public.pickup_requests to service_role;

alter table public.trips disable row level security;
grant all on table public.trips to anon;
grant all on table public.trips to authenticated;
grant all on table public.trips to service_role;

alter table public.invitations disable row level security;
grant all on table public.invitations to anon;
grant all on table public.invitations to authenticated;
grant all on table public.invitations to service_role;

alter table public.trip_participants disable row level security;
grant all on table public.trip_participants to anon;
grant all on table public.trip_participants to authenticated;
grant all on table public.trip_participants to service_role;

alter table public.trip_arrivals disable row level security;
grant all on table public.trip_arrivals to anon;
grant all on table public.trip_arrivals to authenticated;
grant all on table public.trip_arrivals to service_role;

alter table public.trip_reviews disable row level security;
grant all on table public.trip_reviews to anon;
grant all on table public.trip_reviews to authenticated;
grant all on table public.trip_reviews to service_role;
