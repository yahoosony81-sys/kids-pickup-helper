-- ============================================================================
-- request_status ENUM에 EXPIRED 상태 추가
-- ============================================================================
-- 변경 사항:
-- 1. request_status ENUM에 EXPIRED 값 추가
--    - 픽업 예정 시간이 지난 요청을 표시
--    - EXPIRED 상태의 요청은 수정/삭제/초대수락 등이 모두 불가능
-- ============================================================================

-- 1. request_status ENUM에 EXPIRED 추가
-- PostgreSQL에서는 ALTER TYPE ... ADD VALUE를 트랜잭션 내에서 실행할 수 없으므로
-- 별도로 실행해야 합니다. 이미 존재하면 에러가 발생하므로 예외 처리합니다.
DO $$ 
BEGIN
  -- EXPIRED 값이 이미 있는지 확인
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'EXPIRED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'EXPIRED';
  END IF;
END $$;

COMMENT ON TYPE request_status IS '요청 상태: REQUESTED(요청됨), MATCHED(매칭됨), IN_PROGRESS(진행중), ARRIVED(도착), COMPLETED(완료), CANCELLED(취소), CANCEL_REQUESTED(취소 요청됨), EXPIRED(기간 만료 - 픽업시간 지남)';
