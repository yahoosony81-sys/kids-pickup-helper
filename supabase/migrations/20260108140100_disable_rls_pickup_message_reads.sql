-- ============================================================================
-- pickup_message_reads 테이블 RLS 비활성화
-- ============================================================================
-- 목적: 개발 단계에서 RLS로 인한 접근 오류 방지
-- ============================================================================

-- pickup_message_reads 테이블의 RLS 비활성화
ALTER TABLE public.pickup_message_reads DISABLE ROW LEVEL SECURITY;

-- 권한 부여 (개발용)
GRANT ALL ON TABLE public.pickup_message_reads TO anon;
GRANT ALL ON TABLE public.pickup_message_reads TO authenticated;
GRANT ALL ON TABLE public.pickup_message_reads TO service_role;

