-- ============================================================================
-- 픽업 그룹 기반 재설계: trips 테이블에 title, scheduled_start_at 추가
-- ============================================================================
-- 변경 사항:
-- 1. trips 테이블에 title (그룹명) 필드 추가
-- 2. trips 테이블에 scheduled_start_at (출발 예정 시각) 필드 추가
-- 3. trip_status ENUM에 LOCKED 상태 추가
-- ============================================================================

-- 1. trip_status ENUM에 LOCKED 추가
-- PostgreSQL에서는 ALTER TYPE ... ADD VALUE를 트랜잭션 내에서 실행할 수 없으므로
-- 별도로 실행해야 합니다. 이미 존재하면 에러가 발생하므로 예외 처리합니다.
DO $$ 
BEGIN
  -- LOCKED 값이 이미 있는지 확인
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'LOCKED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trip_status')
  ) THEN
    ALTER TYPE trip_status ADD VALUE 'LOCKED';
  END IF;
END $$;

-- 2. trips 테이블에 title 필드 추가 (NULL 허용, 기존 데이터는 NULL)
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.trips.title IS '픽업 그룹명 (예: "1월 7일 15시 픽업 그룹")';

-- 3. trips 테이블에 scheduled_start_at 필드 추가 (NULL 허용, 기존 데이터는 NULL)
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ;

COMMENT ON COLUMN public.trips.scheduled_start_at IS '출발 예정 시각. 출발 30분 전에는 초대 불가, 출발 1시간 전에는 PENDING 초대가 자동 EXPIRED 처리됨.';

-- 4. 인덱스 추가 (scheduled_start_at 기준 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_trips_scheduled_start_at 
ON public.trips(scheduled_start_at) 
WHERE scheduled_start_at IS NOT NULL;

