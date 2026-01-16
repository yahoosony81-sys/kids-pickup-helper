-- 픽업 장소 도착 확인 필드 추가
-- 제공자가 학생을 만났을 때 확인할 수 있는 필드

ALTER TABLE public.trip_participants 
ADD COLUMN IF NOT EXISTS is_met_at_pickup boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.trip_participants.is_met_at_pickup IS 
'픽업 장소 도착 확인 여부. 제공자가 학생을 만났을 때 true로 설정됨.';
