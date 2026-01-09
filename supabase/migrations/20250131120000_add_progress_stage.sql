-- ============================================================================
-- 픽업 진행 단계 필드 추가
-- ============================================================================
-- pickup_requests 테이블에 progress_stage, started_at, picked_up_at 필드 추가
-- 요청자 마이페이지에서 단계별 UI 표시를 위한 필드
-- ============================================================================

-- 1. progress_stage 필드 추가 (TEXT, 기본값: 'MATCHED')
ALTER TABLE public.pickup_requests
ADD COLUMN IF NOT EXISTS progress_stage TEXT DEFAULT 'MATCHED';

-- 2. started_at 필드 추가 (출발 시간)
ALTER TABLE public.pickup_requests
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 3. picked_up_at 필드 추가 (픽업 완료 시간)
ALTER TABLE public.pickup_requests
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;

-- 4. 기존 데이터의 progress_stage 초기화
-- MATCHED 상태인 경우 progress_stage = 'MATCHED'
-- IN_PROGRESS 이상인 경우 progress_stage = 'STARTED' (기본값)
UPDATE public.pickup_requests
SET progress_stage = CASE
  WHEN status = 'MATCHED' THEN 'MATCHED'
  WHEN status IN ('IN_PROGRESS', 'ARRIVED', 'COMPLETED') THEN 'STARTED'
  ELSE 'MATCHED'
END
WHERE progress_stage IS NULL;

-- 5. 코멘트 추가
COMMENT ON COLUMN public.pickup_requests.progress_stage IS '픽업 진행 단계: MATCHED, STARTED, PICKED_UP, ARRIVED, COMPLETED';
COMMENT ON COLUMN public.pickup_requests.started_at IS '제공자가 출발 버튼을 클릭한 시간';
COMMENT ON COLUMN public.pickup_requests.picked_up_at IS '제공자가 픽업 완료 버튼을 클릭한 시간';

