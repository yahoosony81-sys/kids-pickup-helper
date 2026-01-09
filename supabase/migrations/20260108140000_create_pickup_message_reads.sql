-- ============================================================================
-- pickup_message_reads 테이블 생성
-- ============================================================================
-- 목적: 사용자가 각 메시지 스레드(invite_id)를 마지막으로 읽은 시각을 저장
--       이를 통해 읽지 않은 메시지 개수를 계산할 수 있음
-- ============================================================================

-- 1. pickup_message_reads 테이블 생성
create table if not exists public.pickup_message_reads (
  id uuid default gen_random_uuid() primary key,
  invite_id uuid not null references public.invitations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique(invite_id, user_id)
);

comment on table public.pickup_message_reads is '메시지 읽음 처리. 각 사용자가 각 메시지 스레드(invite_id)를 마지막으로 읽은 시각을 저장하여 읽지 않은 메시지 개수를 계산하는 데 사용됨.';

comment on column public.pickup_message_reads.invite_id is '스레드 키. invitations.id 참조.';
comment on column public.pickup_message_reads.user_id is '사용자 Profile ID. profiles.id 참조.';
comment on column public.pickup_message_reads.last_read_at is '마지막으로 읽은 시각. 이 시각 이후의 메시지가 읽지 않은 메시지로 계산됨.';

-- 2. 인덱스 생성 (조회 성능 최적화)
-- invite_id와 user_id 기준으로 조회하므로 복합 인덱스 생성
create index if not exists idx_pickup_message_reads_invite_user 
on public.pickup_message_reads(invite_id, user_id);

-- 3. RLS는 이번 단계에서는 설정하지 않음 (개발 단계)

