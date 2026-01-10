-- ============================================================================
-- trips 테이블에 is_test 컬럼 추가
-- ============================================================================
-- 목적: 테스트용 픽업 그룹을 마킹하여 제공하기 화면에서는 숨기고,
--       마이페이지 캘린더 이력에서는 표시하기 위함
-- ============================================================================

-- 1. trips 테이블에 is_test 필드 추가 (NOT NULL DEFAULT false)
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.trips.is_test IS '테스트용 픽업 그룹 여부. true인 경우 제공하기 화면에서는 숨김, 마이페이지 캘린더에서는 표시됨.';

-- 2. 인덱스 추가 (is_test=true인 경우만, 선택적 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_trips_is_test 
ON public.trips(is_test) 
WHERE is_test = true;
