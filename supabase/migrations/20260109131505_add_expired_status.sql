-- ============================================================================
-- trip_status ENUM에 EXPIRED 상태 추가
-- ============================================================================
-- 변경 사항:
-- 1. trip_status ENUM에 EXPIRED 값 추가
--    - 출발 예정 시간이 지났는데도 출발하지 않은 그룹을 표시
--    - EXPIRED 상태의 그룹은 초대/수락/출발이 모두 불가능
-- ============================================================================

-- 1. trip_status ENUM에 EXPIRED 추가
-- PostgreSQL에서는 ALTER TYPE ... ADD VALUE를 트랜잭션 내에서 실행할 수 없으므로
-- 별도로 실행해야 합니다. 이미 존재하면 에러가 발생하므로 예외 처리합니다.
DO $$ 
BEGIN
  -- EXPIRED 값이 이미 있는지 확인
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'EXPIRED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trip_status')
  ) THEN
    ALTER TYPE trip_status ADD VALUE 'EXPIRED';
  END IF;
END $$;

COMMENT ON TYPE trip_status IS 'Trip 상태: OPEN(초대 가능), LOCKED(초대 마감), IN_PROGRESS(출발 진행 중), ARRIVED(도착), COMPLETED(완료), CANCELLED(취소), EXPIRED(기간 만료 - 실행되지 않음)';

