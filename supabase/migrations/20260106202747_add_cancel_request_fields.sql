-- ============================================================================
-- 취소 요청 및 승인 기능 추가 마이그레이션
-- ============================================================================
-- 변경 사항:
-- 1) request_status ENUM에 CANCEL_REQUESTED 추가
-- 2) pickup_requests 테이블에 취소 관련 필드 추가
-- 3) push_notifications 테이블 생성 (푸시 알림 이벤트 저장용)
-- ============================================================================

-- ============================================================================
-- 1. ENUM 타입 확장 (CANCEL_REQUESTED 추가)
-- ============================================================================
-- PostgreSQL에서는 ALTER TYPE ... ADD VALUE를 트랜잭션 밖에서 실행해야 함
-- 중복 실행 방지를 위해 DO 블록 사용
DO $$ 
BEGIN
  -- ENUM에 값이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'CANCEL_REQUESTED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'CANCEL_REQUESTED';
  END IF;
END $$;

-- ============================================================================
-- 2. pickup_requests 테이블 필드 추가
-- ============================================================================
ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_approved_by uuid REFERENCES public.profiles(id);

COMMENT ON COLUMN public.pickup_requests.cancel_requested_at IS '요청자가 취소 요청한 시각';
COMMENT ON COLUMN public.pickup_requests.cancel_approved_at IS '제공자가 취소를 승인한 시각';
COMMENT ON COLUMN public.pickup_requests.cancel_approved_by IS '취소를 승인한 제공자의 profile ID';

-- ============================================================================
-- 3. push_notifications 테이블 생성 (푸시 알림 이벤트 저장용)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload_json jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz
);

COMMENT ON TABLE public.push_notifications IS '푸시 알림 이벤트 큐. 실제 모바일 푸시 전송은 별도 프로세스에서 처리.';
COMMENT ON COLUMN public.push_notifications.user_profile_id IS '알림을 받을 사용자의 profile ID';
COMMENT ON COLUMN public.push_notifications.type IS '알림 타입 (예: cancel_requested, cancel_approved)';
COMMENT ON COLUMN public.push_notifications.payload_json IS '알림 페이로드 (JSON 형식)';
COMMENT ON COLUMN public.push_notifications.processed_at IS '알림이 처리된 시각 (null이면 미처리)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_push_notifications_user 
  ON public.push_notifications(user_profile_id);

CREATE INDEX IF NOT EXISTS idx_push_notifications_processed 
  ON public.push_notifications(processed_at) 
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_push_notifications_created 
  ON public.push_notifications(created_at);

-- ============================================================================
-- 4. RLS 비활성화 + 권한 (개발용)
-- ============================================================================
ALTER TABLE public.push_notifications DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.push_notifications TO anon;
GRANT ALL ON TABLE public.push_notifications TO authenticated;
GRANT ALL ON TABLE public.push_notifications TO service_role;

