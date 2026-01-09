-- ============================================================================
-- pickup_messages 테이블 생성
-- ============================================================================
-- 목적: 매칭 완료된 각 요청자(ACCEPTED invitation)마다 제공자↔요청자가 
--       메시지를 주고받을 수 있게 함
-- 스레드 키: invite_id (invitations.id)
-- ============================================================================

-- 1. pickup_messages 테이블 생성
create table if not exists public.pickup_messages (
  id uuid default gen_random_uuid() primary key,
  invite_id uuid not null references public.invitations(id) on delete restrict,
  pickup_group_id uuid null references public.trips(id) on delete restrict,
  pickup_request_id uuid null references public.pickup_requests(id) on delete restrict,
  provider_id uuid not null references public.profiles(id) on delete restrict,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  sender_role text not null check (sender_role in ('PROVIDER', 'REQUESTER')),
  body text not null,
  created_at timestamptz default now() not null
);

comment on table public.pickup_messages is '픽업 메시지. 매칭 완료된 각 요청자(ACCEPTED invitation)마다 제공자↔요청자가 주고받는 메시지. invite_id를 스레드 키로 사용하여 개별 매칭 단위로 분리됨.';

comment on column public.pickup_messages.invite_id is '스레드 키. invitations.id 참조. 같은 invite_id를 가진 메시지들이 하나의 스레드를 구성함.';
comment on column public.pickup_messages.pickup_group_id is '참조용. trips.id (픽업 그룹 ID)';
comment on column public.pickup_messages.pickup_request_id is '참조용. pickup_requests.id (픽업 요청 ID)';
comment on column public.pickup_messages.provider_id is '제공자 Profile ID';
comment on column public.pickup_messages.requester_id is '요청자 Profile ID';
comment on column public.pickup_messages.sender_id is '발신자 Profile ID';
comment on column public.pickup_messages.sender_role is '발신자 역할. PROVIDER 또는 REQUESTER';
comment on column public.pickup_messages.body is '메시지 본문';
comment on column public.pickup_messages.created_at is '메시지 생성 시각';

-- 2. 인덱스 생성 (메시지 조회 성능 최적화)
-- invite_id와 created_at 기준으로 조회하므로 복합 인덱스 생성
create index if not exists idx_pickup_messages_invite_created 
on public.pickup_messages(invite_id, created_at);

-- 3. RLS는 이번 단계에서는 설정하지 않음 (개발 단계)

