-- ============================================================================
-- pickup_time 컬럼 타입 변경: timestamptz → timestamp
-- ============================================================================
-- 변경 사항:
-- 1) pickup_requests.pickup_time을 timestamptz에서 timestamp로 변경
-- 2) 한국 시간 기준으로 저장하므로 타임존 정보 불필요
-- ============================================================================

-- 기존 데이터가 있다면 한국 시간으로 변환하여 저장
-- timestamptz는 UTC로 저장되어 있으므로, Asia/Seoul 타임존으로 변환
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  -- 기존 데이터 확인
  SELECT COUNT(*) INTO row_count FROM public.pickup_requests;
  
  IF row_count > 0 THEN
    -- 기존 UTC 시간을 한국 시간(Asia/Seoul)으로 변환
    -- AT TIME ZONE 'Asia/Seoul'을 사용하면 자동으로 한국 시간대로 변환됨
    UPDATE public.pickup_requests
    SET pickup_time = (pickup_time AT TIME ZONE 'Asia/Seoul')::timestamp
    WHERE pickup_time IS NOT NULL;
    
    RAISE NOTICE '기존 %개의 레코드의 pickup_time을 한국 시간으로 변환했습니다.', row_count;
  END IF;
END $$;

-- 컬럼 타입 변경: timestamptz → timestamp
ALTER TABLE public.pickup_requests
  ALTER COLUMN pickup_time TYPE timestamp WITHOUT TIME ZONE
  USING (pickup_time AT TIME ZONE 'Asia/Seoul')::timestamp;

COMMENT ON COLUMN public.pickup_requests.pickup_time IS '픽업 시간 (한국 시간 기준, 타임존 없음)';

