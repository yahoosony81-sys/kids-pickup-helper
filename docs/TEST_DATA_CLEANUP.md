# 테스트 데이터 정리 가이드

## 개요
이 문서는 내 계정의 테스트용 픽업 제공 카드(픽업 그룹)를 1회성으로 정리하기 위한 SQL 스크립트를 제공합니다.

## 목적
- 내 계정의 과거 테스트용 제공 카드들을 화면에서 정리
- DELETE 없이, `is_test=true`로 마킹하여 제공하기 화면에서는 숨김
- 마이페이지 캘린더 이력에서는 계속 표시

## 안전장치
⚠️ **중요**: 모든 SQL 쿼리는 반드시 `provider_profile_id = [내 계정의 profile_id]` 조건을 포함해야 합니다.
다른 유저의 데이터에 영향을 주지 않도록 주의하세요.

## 1회성 마킹 SQL

### Step 1: 내 계정의 Profile ID 확인
```sql
-- Clerk User ID를 알고 있는 경우
SELECT id, clerk_user_id 
FROM public.profiles 
WHERE clerk_user_id = 'user_xxxxxxxxxxxxx';

-- 또는 이메일로 확인
-- (profiles 테이블에 이메일 컬럼이 있다면)
```

### Step 2: 테스트 카드 마킹
```sql
-- ⚠️ 주의: provider_profile_id를 반드시 본인의 profile_id로 변경하세요!
-- 예시: provider_profile_id = '123e4567-e89b-12d3-a456-426614174000'

UPDATE public.trips
SET is_test = true
WHERE provider_profile_id = 'YOUR_PROFILE_ID_HERE'  -- ⚠️ 반드시 변경 필요!
  AND (
    -- 조건 1: 2026-01-01 이전에 생성된 그룹
    created_at < '2026-01-01 00:00:00+00'::timestamptz
    OR
    -- 조건 2: scheduled_start_at이 NULL이거나 과거인 그룹
    scheduled_start_at IS NULL 
    OR scheduled_start_at < NOW()
  )
  AND is_test = false;  -- 이미 마킹된 것은 제외
```

### Step 3: 마킹 결과 확인
```sql
-- 내 계정의 테스트 카드 개수 확인
SELECT COUNT(*) as test_trip_count
FROM public.trips
WHERE provider_profile_id = 'YOUR_PROFILE_ID_HERE'  -- ⚠️ 반드시 변경 필요!
  AND is_test = true;

-- 테스트 카드 상세 확인
SELECT 
  id,
  title,
  status,
  created_at,
  scheduled_start_at,
  is_test
FROM public.trips
WHERE provider_profile_id = 'YOUR_PROFILE_ID_HERE'  -- ⚠️ 반드시 변경 필요!
  AND is_test = true
ORDER BY created_at DESC;
```

### Step 4: 롤백 (필요시)
```sql
-- 마킹을 취소하려면 (1회성 작업이므로 일반적으로 불필요)
UPDATE public.trips
SET is_test = false
WHERE provider_profile_id = 'YOUR_PROFILE_ID_HERE'  -- ⚠️ 반드시 변경 필요!
  AND is_test = true;
```

## 테스트 카드 정의 기준
현재 SQL은 다음 조건 중 하나라도 만족하는 `trips`를 테스트 카드로 간주합니다:
1. `created_at < '2026-01-01'`: 2026년 1월 1일 이전에 생성된 그룹
2. `scheduled_start_at IS NULL`: 출발 예정 시각이 없는 그룹
3. `scheduled_start_at < NOW()`: 출발 예정 시각이 과거인 그룹

**필요시 기준일을 조정하세요:**
- 더 이른 날짜로 변경: `created_at < '2025-12-01'`
- 더 늦은 날짜로 변경: `created_at < '2026-02-01'`

## 주의사항
1. **절대 DELETE 하지 마세요**: 물리 삭제는 하지 않고 마킹만 수행합니다.
2. **다른 유저 영향 없음**: `provider_profile_id` 조건으로 본인 계정만 영향받습니다.
3. **기존 로직 유지**: status 전이, 만료 처리 등 기존 로직은 변경되지 않습니다.
4. **1회성 작업**: 이 작업은 한 번만 실행하면 됩니다.

## 실행 방법
1. Supabase Dashboard의 SQL Editor에서 실행
2. 또는 Supabase CLI를 사용하여 실행
3. 또는 애플리케이션의 관리자 기능으로 실행 (구현된 경우)

## 검증
마킹 후 다음을 확인하세요:
1. 제공하기 화면(`/trips/new`)에서 테스트 카드가 보이지 않는지
2. 마이페이지 캘린더에서 테스트 카드가 날짜별로 집계되는지
3. 날짜 클릭 시 테스트 카드가 리스트에 포함되는지
