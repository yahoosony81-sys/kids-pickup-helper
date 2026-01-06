# 우리아이 픽업이모 MVP v1.0 개발 TODO

> 📌 **절대 규칙**
> - PRD.md는 비즈니스/상태 규칙의 Single Source of Truth
> - SQL(migrations)은 DB 구조의 Single Source of Truth
> - DB 스키마 수정 금지 (테이블/컬럼/enum/index 변경 X)
> - 초대/LOCK/capacity/상태 전이는 PRD Section 4 규칙을 최우선으로 따름
> - Server Action/API는 DB 제약을 우회하지 말고, 위반 시 에러를 그대로 처리

---

## Phase 1: Clerk 인증 + Profiles 동기화

### Task 1.1: Clerk 인증 설정 확인
- [ ] Clerk 대시보드에서 프로젝트 설정 확인 (한국어 로케일)
- [x] `.env` 파일에 Clerk 키 확인 (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
- [x] `middleware.ts`에서 인증 보호 라우트 확인
- **완료 기준**: 로그인/회원가입 페이지 접근 가능, 인증 후 리다이렉트 정상 동작

### Task 1.2: Profiles 동기화 로직 구현
- [x] `hooks/use-sync-user.ts` 확인 또는 생성 (Clerk → Supabase profiles 동기화)
- [x] `components/providers/sync-user-provider.tsx` 확인 또는 생성
- [x] `app/api/sync-user/route.ts` 확인 또는 생성 (실제 동기화 API)
- [x] `app/layout.tsx`에 `SyncUserProvider` 추가
- **완료 기준**: 로그인 시 `profiles` 테이블에 `clerk_user_id` 기준 레코드 자동 생성 확인

### Task 1.3: Profiles 조회 훅/유틸 생성
- [x] `hooks/use-profile.ts` 생성 (현재 사용자 profile 조회)
- [x] `lib/supabase/clerk-client.ts`에서 profile 조회 함수 확인
- **완료 기준**: 로그인 후 프로필 정보를 화면에서 확인 가능

### Phase 1 실행 확인
```sql
-- Clerk 로그인 후 실행
SELECT id, clerk_user_id, created_at 
FROM public.profiles 
WHERE clerk_user_id = 'user_xxx';  -- 실제 Clerk user ID로 확인
```
- [x] 쿼리 결과로 profile 레코드 존재 확인
- [x] 브라우저 콘솔에서 profile 정보 출력 확인

---

## Phase 2: 픽업 요청 등록 (pickup_requests)

### Task 2.1: 픽업 요청 등록 페이지 UI
- [x] `app/(routes)/pickup-requests/new/page.tsx` 생성
- [x] 지도 API 연동 (출발지/목적지 검색 및 좌표 저장)
- [x] 폼 필드: `pickup_time`, `origin_text`, `origin_lat`, `origin_lng`, `destination_text`, `destination_lat`, `destination_lng`
- [x] React Hook Form + Zod 스키마로 유효성 검사
- **완료 기준**: 폼 입력 및 지도 좌표 선택 가능, 유효성 검사 동작

### Task 2.2: 픽업 요청 등록 Server Action
- [x] `actions/pickup-requests.ts` 생성
- [x] `createPickupRequest` 함수 구현
  - 현재 사용자 `profile_id` 조회
  - `pickup_requests` 테이블에 INSERT
  - `status = 'REQUESTED'` 기본값
- [x] 에러 처리 (DB 제약 위반 시 명확한 에러 메시지)
- **완료 기준**: 폼 제출 시 DB에 레코드 생성, `status = 'REQUESTED'` 확인

### Task 2.3: 픽업 요청 목록 조회
- [x] `app/(routes)/pickup-requests/page.tsx` 생성
- [x] `actions/pickup-requests.ts`에 `getMyPickupRequests` 함수 추가
- [x] 현재 사용자의 요청 목록 조회 (최신순)
- [x] 상태별 필터링 (선택사항)
- **완료 기준**: 내가 등록한 픽업 요청 목록 화면에 표시

---

### Phase 2 Plan Mode Build 상세 작업 내역

#### 디렉토리 구조 생성
- [x] `app/(routes)/pickup-requests/new/` 디렉토리 생성
- [x] `app/(routes)/pickup-requests/` 디렉토리 생성
- [x] `actions/` 디렉토리 생성
- [x] `components/map/` 디렉토리 생성
- [x] `lib/validations/` 디렉토리 생성

#### Zod 스키마 정의
- [x] `lib/validations/pickup-request.ts` 생성
- [x] 픽업 시간 유효성 검사 (미래 시간만 허용)
- [x] 출발지/목적지 좌표 검증 (한국 지역 범위)
- [x] TypeScript 타입 정의 (PickupRequestFormData)

#### 네이버 지도 API 연동
- [x] `components/map/naver-map-search.tsx` 컴포넌트 생성
- [x] 네이버 지도 API 스크립트 동적 로드
- [x] 주소 검색 기능 (Geocoding API)
- [x] 지도 클릭으로 위치 선택 기능
- [x] 역지오코딩 (좌표 → 주소)
- [x] 선택한 위치의 좌표 및 주소 반환
- [x] 환경 변수 `.env`에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 추가 완료

#### Server Actions 구현
- [x] `actions/pickup-requests.ts` 생성
- [x] `createPickupRequest` 함수 구현
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회 (clerk_user_id 기준)
  - [x] DB INSERT (pickup_requests 테이블)
  - [x] 에러 처리 및 사용자 친화적 메시지
  - [x] 캐시 무효화 (revalidatePath)
- [x] `getMyPickupRequests` 함수 구현
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회
  - [x] DB SELECT (requester_profile_id 기준)
  - [x] 최신순 정렬
  - [x] 상태 필터링 파라미터 (선택사항)

#### 등록 페이지 UI
- [x] `app/(routes)/pickup-requests/new/page.tsx` 생성
- [x] React Hook Form + Zod resolver 설정
- [x] shadcn/ui Form 컴포넌트 사용
- [x] 픽업 시간 입력 (datetime-local)
- [x] 출발지 선택 (네이버 지도 검색 컴포넌트)
- [x] 목적지 선택 (네이버 지도 검색 컴포넌트)
- [x] 폼 제출 처리 및 로딩 상태
- [x] 에러 메시지 표시
- [x] 성공 시 목록 페이지로 리다이렉트

#### 목록 페이지 UI
- [x] `app/(routes)/pickup-requests/page.tsx` 생성
- [x] Server Component로 구현
- [x] `getMyPickupRequests` 호출
- [x] 카드 형태로 요청 목록 표시
- [x] 상태별 배지/색상 구분
- [x] 픽업 시간, 출발지, 목적지 표시
- [x] 빈 목록 처리
- [x] "새 요청 등록" 버튼

#### 네비게이션
- [x] Navbar에 "픽업 요청" 링크 추가 (로그인 사용자만 표시)
- [x] 목록 페이지에서 "새 요청 등록" 버튼
- [x] 등록 페이지에서 "취소" 버튼 (뒤로가기)
- [x] 인증 보호: Server Action에서 인증 확인 (middleware는 현재 상태 유지)

### Phase 2 실행 확인
```sql
-- 픽업 요청 등록 후 실행
SELECT id, requester_profile_id, pickup_time, status, origin_text, destination_text
FROM public.pickup_requests
WHERE requester_profile_id = (SELECT id FROM profiles WHERE clerk_user_id = 'user_xxx')
ORDER BY created_at DESC;
```
- [ ] 쿼리 결과로 등록한 요청 확인
- [ ] 화면에서 요청 목록 표시 확인

---

## Phase 3: 제공자 Trip 생성 (trips)

### Task 3.1: Trip 생성 페이지 UI
- [x] `app/(routes)/trips/new/page.tsx` 생성
- [x] 제공자 전용 페이지 (권한 체크)
- [x] Trip 생성 폼 (최소 정보만, 초대는 별도 단계)
- **완료 기준**: 제공자가 Trip 생성 페이지 접근 및 폼 표시

### Task 3.2: Trip 생성 Server Action
- [x] `actions/trips.ts` 생성
- [x] `createTrip` 함수 구현
  - 현재 사용자 `profile_id` 조회
  - `trips` 테이블에 INSERT
  - `status = 'OPEN'`, `is_locked = false`, `capacity = 3` 기본값
- **완료 기준**: Trip 생성 시 DB에 레코드 생성, `status = 'OPEN'` 확인

### Task 3.3: Trip 목록 조회
- [x] `app/(routes)/trips/page.tsx` 생성
- [x] `actions/trips.ts`에 `getMyTrips` 함수 추가
- [x] 현재 제공자의 Trip 목록 조회 (최신순)
- [x] 상태별 필터링 (`OPEN`, `IN_PROGRESS` 등)
- **완료 기준**: 내가 생성한 Trip 목록 화면에 표시

---

### Phase 3 Plan Mode Build 상세 작업 내역

#### Server Actions 구현
- [x] `actions/trips.ts` 생성
- [x] `createTrip` 함수 구현
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회 (clerk_user_id 기준)
  - [x] DB INSERT (trips 테이블)
  - [x] 기본값 설정: `status = 'OPEN'`, `is_locked = false`, `capacity = 3`
  - [x] 에러 처리 및 사용자 친화적 메시지
  - [x] 캐시 무효화 (revalidatePath)
- [x] `getMyTrips` 함수 구현
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회
  - [x] DB SELECT (provider_profile_id 기준)
  - [x] 최신순 정렬
  - [x] 상태 필터링 파라미터 (선택사항)

#### Trip 생성 페이지 UI
- [x] `app/(routes)/trips/new/page.tsx` 생성
- [x] Client Component로 구현
- [x] 제공자 전용 페이지 표시 (UI에만 표시)
- [x] 최소 정보만 입력 (초대는 별도 단계)
- [x] "Trip 생성" 버튼 제공
- [x] 제출 성공 시 Trip 목록 페이지로 리다이렉트
- [x] `dynamic = 'force-dynamic'` 추가

#### Trip 목록 페이지 UI
- [x] `app/(routes)/trips/page.tsx` 생성
- [x] Server Component로 구현
- [x] `getMyTrips` 호출
- [x] 카드 형태로 Trip 목록 표시
- [x] 상태별 배지/색상 구분 (`OPEN`, `IN_PROGRESS`, `ARRIVED`, `COMPLETED`, `CANCELLED`)
- [x] 각 Trip 정보 표시 (상태, 생성 시간, 수용 인원, LOCK 여부)
- [x] 빈 목록 처리
- [x] "새 Trip 생성" 버튼
- [x] `dynamic = 'force-dynamic'` 추가

#### 네비게이션
- [x] Navbar에 "내 Trip" 링크 추가 (로그인 사용자만 표시)
- [x] 목록 페이지에서 "새 Trip 생성" 버튼
- [x] 생성 페이지에서 "취소" 버튼 (뒤로가기)

### Phase 3 실행 확인
```sql
-- Trip 생성 후 실행
SELECT id, provider_profile_id, status, is_locked, capacity, created_at
FROM public.trips
WHERE provider_profile_id = (SELECT id FROM profiles WHERE clerk_user_id = 'user_xxx')
ORDER BY created_at DESC;
```
- [x] 쿼리 결과로 생성한 Trip 확인
- [x] 화면에서 Trip 목록 표시 확인

---

## Phase 4: 초대 전송 (invitations)

### Task 4.1: 요청자 리스트 조회 UI
- [x] `app/(routes)/trips/[tripId]/invite/page.tsx` 생성
- [x] 요청자 리스트 조회 (노출 정보: 시간대, 대략 위치, 목적지 유형)
- [x] 정확한 주소/좌표는 초대 수락 후 공개 (PRD 규칙)
- [x] `status = 'REQUESTED'`인 요청만 표시
- **완료 기준**: 요청자 리스트 화면에 표시, 상세 정보는 숨김

---

### Task 4.1 Plan Mode Build 상세 작업 내역

#### 주소 파싱 유틸리티 생성
- [x] `lib/utils/address.ts` 생성
- [x] `extractAreaFromAddress` 함수 구현 (한국 주소에서 구/동 추출)
- [x] `detectDestinationType` 함수 구현 (목적지 유형 판단: 학원, 학교, 집, 기타)
- [x] 주소 파싱 실패 시 안전 처리 (전체 주소 반환)

#### Trip 조회 Server Action 추가
- [x] `actions/trips.ts`에 `getTripById` 함수 추가
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회
  - [x] Trip 조회 및 소유자 확인
  - [x] Trip 상태 정보 반환

#### 요청자 리스트 조회 Server Action 추가
- [x] `actions/pickup-requests.ts`에 `getAvailablePickupRequests` 함수 추가
  - [x] Clerk 인증 확인
  - [x] `status = 'REQUESTED'` 필터링
  - [x] 주소 파싱 유틸리티로 대략 위치 추출
  - [x] 목적지 유형 판단
  - [x] 제한된 정보만 반환 (id, pickup_time, origin_area, destination_area, destination_type)
  - [x] 정확한 주소/좌표 제외 (PRD 규칙 준수)

#### 초대 페이지 UI 생성
- [x] `app/(routes)/trips/[tripId]/invite/page.tsx` 생성
- [x] Server Component로 구현
- [x] `dynamic = 'force-dynamic'` 추가
- [x] Trip 소유자 확인 및 에러 처리
- [x] Trip LOCK 상태 확인 (LOCK된 Trip은 초대 불가)
- [x] 요청자 리스트 카드 형태로 표시
- [x] 각 요청 카드에 표시:
  - [x] 픽업 시간 (시간대만, 예: "오후 3시")
  - [x] 출발지 대략 위치 (구/동)
  - [x] 목적지 대략 위치 및 유형 (구/동 + 유형)
- [x] 목적지 유형별 아이콘 및 색상 구분
- [x] 각 요청에 "초대하기" 버튼 (Task 4.2에서 기능 구현 예정)
- [x] 빈 목록 처리
- [x] 에러 처리 (Trip 소유자 아님, Trip LOCK됨 등)

#### 네비게이션 연결
- [x] Trip 목록 페이지(`app/(routes)/trips/page.tsx`)에 "초대하기" 버튼 추가
- [x] 각 Trip 카드에 초대 페이지로 링크 (`/trips/[tripId]/invite`)
- [x] LOCK된 Trip은 버튼 비활성화

### Task 4.2: 초대 전송 Server Action
- [x] `actions/invitations.ts` 생성
- [x] `sendInvitation` 함수 구현
  - **서버 검증 필수**:
    - 요청자는 동시에 `PENDING` 초대 1개만 허용 (DB unique index 활용)
    - 제공자는 수락된 인원이 3명 미만일 때만 초대 가능 (`trip_participants` 조회)
    - Trip이 `is_locked = false`인지 확인
  - `invitations` 테이블에 INSERT
  - `status = 'PENDING'`, `expires_at` 설정 (예: 24시간 후)
- [x] 에러 처리 (제약 위반 시 명확한 에러 메시지)
- **완료 기준**: 초대 전송 시 DB에 레코드 생성, 제약 위반 시 에러 반환

---

### Task 4.2 Plan Mode Build 상세 작업 내역

#### Server Action 구현
- [x] `actions/invitations.ts` 생성
- [x] `sendInvitation` 함수 구현
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회 (제공자)
  - [x] Trip 조회 및 소유자 확인
  - [x] Trip LOCK 상태 확인 (`is_locked = false`)
  - [x] 픽업 요청 조회 및 요청자 Profile ID 확인
  - [x] 픽업 요청 상태 확인 (`status = 'REQUESTED'`)
  - [x] 요청자 PENDING 초대 1개 제한 검증 (DB unique index 활용)
  - [x] 제공자 capacity 제한 검증 (`trip_participants` COUNT < 3)
  - [x] 초대 레코드 INSERT (`status = 'PENDING'`, `expires_at = 24시간 후`)
  - [x] 에러 처리 및 사용자 친화적 메시지
  - [x] 상세한 로깅 (console.group, console.log)
  - [x] 캐시 무효화 (revalidatePath)

#### 초대 버튼 컴포넌트 생성
- [x] `components/invitations/invite-button.tsx` 생성
  - [x] Client Component로 구현
  - [x] `sendInvitation` Server Action 호출
  - [x] 로딩 상태 관리
  - [x] 에러 메시지 표시
  - [x] 성공 시 페이지 새로고침 (router.refresh)

#### 초대 페이지 UI 연결
- [x] `app/(routes)/trips/[tripId]/invite/page.tsx` 수정
  - [x] `InviteButton` 컴포넌트 import
  - [x] 기존 "초대하기" 버튼을 `InviteButton` 컴포넌트로 교체
  - [x] Trip ID, Pickup Request ID, Trip LOCK 상태 전달

### Task 4.3: 초대 목록 조회
- [x] `actions/invitations.ts`에 `getTripInvitations` 함수 추가
- [x] 특정 Trip의 초대 목록 조회 (상태별)
- [x] 만료된 초대 자동 `EXPIRED` 처리 (선택사항, 또는 별도 cron)
- **완료 기준**: Trip별 초대 목록 화면에 표시

---

### Task 4.3 Plan Mode Build 상세 작업 내역

#### Server Action 구현
- [x] `actions/invitations.ts`에 `getTripInvitations` 함수 추가
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회 (제공자)
  - [x] Trip 조회 및 소유자 확인
  - [x] 만료된 PENDING 초대 자동 EXPIRED 처리 (expires_at < now())
  - [x] 특정 Trip의 초대 목록 조회 (상태별 필터링 옵션)
  - [x] 초대와 함께 픽업 요청 정보 JOIN (pickup_requests 테이블)
  - [x] 초대 상태별 정렬 (PENDING → ACCEPTED → REJECTED → EXPIRED)
  - [x] 상세한 로깅 (console.group, console.log)
  - [x] 에러 처리 및 사용자 친화적 메시지

#### 초대 페이지 UI 수정
- [x] `app/(routes)/trips/[tripId]/invite/page.tsx` 수정
  - [x] `getTripInvitations` Server Action import 및 호출
  - [x] "보낸 초대 목록" 섹션 추가
  - [x] 초대 목록 카드 형태로 표시
  - [x] 각 초대 카드에 표시:
    - [x] 초대 상태 배지 (PENDING: 노란색, ACCEPTED: 초록색, REJECTED: 회색, EXPIRED: 빨간색)
    - [x] 픽업 요청 정보 (시간, 출발지, 목적지)
    - [x] 만료 시간 (PENDING/EXPIRED인 경우)
    - [x] 응답 시간 (ACCEPTED/REJECTED인 경우)
  - [x] 빈 목록 처리
  - [x] 에러 처리

### Phase 4 실행 확인

#### 1. 초대 전송 후 데이터베이스 확인
```sql
-- 특정 Trip의 초대 목록 확인
SELECT 
  i.id,
  i.trip_id,
  i.pickup_request_id,
  i.status,
  i.expires_at,
  i.responded_at,
  i.created_at,
  pr.pickup_time,
  pr.origin_text,
  pr.destination_text
FROM public.invitations i
JOIN public.pickup_requests pr ON i.pickup_request_id = pr.id
WHERE i.trip_id = 'trip_xxx'  -- 실제 Trip ID로 변경
ORDER BY i.created_at DESC;

-- 모든 초대 목록 확인 (최근 10개)
SELECT 
  i.id,
  i.trip_id,
  i.pickup_request_id,
  i.requester_profile_id,
  i.status,
  i.expires_at,
  i.created_at
FROM public.invitations i
ORDER BY i.created_at DESC
LIMIT 10;
```

#### 2. 요청자 PENDING 초대 1개 제한 확인
```sql
-- PENDING 초대가 2개 이상인 요청자 확인 (결과 없어야 함)
SELECT 
  requester_profile_id, 
  COUNT(*) as pending_count
FROM public.invitations 
WHERE status = 'PENDING' 
GROUP BY requester_profile_id 
HAVING COUNT(*) > 1;

-- 각 요청자의 초대 상태별 개수 확인
SELECT 
  requester_profile_id,
  status,
  COUNT(*) as count
FROM public.invitations
GROUP BY requester_profile_id, status
ORDER BY requester_profile_id, status;
```

#### 3. 코드 레벨 확인 사항
- [x] `sendInvitation` 함수에서 요청자 PENDING 초대 1개 제한 검증 구현 확인
  - 코드 위치: `actions/invitations.ts` 151-178줄
  - 검증 로직: `existingInvitation` 체크 후 에러 반환
- [x] DB unique index 존재 확인
  - 인덱스명: `idx_invitations_unique_pending_requester`
  - 위치: `supabase/migrations/db.sql` 202-204줄
  - 제약: `requester_profile_id`에 대해 `status = 'PENDING'`인 경우 unique
- [x] DB unique index 위반 시 에러 처리 확인
  - 코드 위치: `actions/invitations.ts` 233-240줄
  - 에러 코드: `23505` (PostgreSQL unique constraint violation)

#### 4. 실제 테스트 시나리오
1. **초대 전송 테스트**:
   - 제공자 계정으로 로그인
   - Trip 생성
   - 요청자에게 초대 전송
   - 위 SQL 쿼리로 초대 레코드 확인

2. **중복 초대 방지 테스트**:
   - 같은 요청자에게 두 번째 초대 전송 시도
   - 예상 결과: "이 요청자는 이미 다른 초대를 대기 중입니다." 에러 메시지
   - 위 SQL 쿼리로 PENDING 초대가 1개만 있는지 확인

3. **초대 목록 조회 테스트**:
   - 초대 페이지(`/trips/[tripId]/invite`) 접근
   - "보낸 초대 목록" 섹션에서 초대 목록 표시 확인
   - 상태별 배지 색상 확인 (PENDING: 노란색, ACCEPTED: 초록색, REJECTED: 회색, EXPIRED: 빨간색)

4. **만료된 초대 자동 처리 테스트**:
   - `expires_at`이 과거인 PENDING 초대 생성 (직접 DB 수정 또는 시간 조작)
   - `getTripInvitations` 호출
   - 해당 초대가 자동으로 EXPIRED 상태로 변경되는지 확인

---

## Phase 5: 초대 수락 → Trip 참여 확정 (trip_participants)

### Task 5.1: 초대 수락/거절 UI
- [x] `app/(routes)/invitations/[invitationId]/page.tsx` 생성
- [x] 초대 상세 정보 표시 (초대 수락 후 정확한 주소/좌표 공개)
- [x] 수락/거절 버튼
- **완료 기준**: 초대 상세 페이지 접근 및 정보 표시

### Task 5.2: 초대 수락 Server Action
- [x] `actions/invitations.ts`에 `acceptInvitation` 함수 추가
- [x] **서버 검증 필수**:
  - [x] 초대 `status = 'PENDING'` 확인
  - [x] `expires_at` 만료 여부 확인
  - [x] Trip `is_locked = false` 확인
  - [x] Trip `capacity` 초과 여부 확인 (`trip_participants` COUNT)
  - [x] 요청자 PENDING 초대 1개 조건 (DB unique index 활용)
- [x] 트랜잭션 처리:
  1. [x] `invitations.status = 'ACCEPTED'`, `responded_at` 업데이트
  2. [x] `trip_participants`에 INSERT
  3. [x] `pickup_requests.status = 'MATCHED'` 업데이트
- [x] 에러 처리 (제약 위반 시 명확한 에러 메시지)
- **완료 기준**: 초대 수락 시 모든 관련 레코드 업데이트, 제약 위반 시 에러 반환

### Task 5.3: 초대 거절 Server Action
- [x] `actions/invitations.ts`에 `rejectInvitation` 함수 추가
- [x] `invitations.status = 'REJECTED'`, `responded_at` 업데이트
- **완료 기준**: 초대 거절 시 상태 업데이트

### Task 5.4: Trip 참여자 목록 조회
- [x] `actions/trips.ts`에 `getTripParticipants` 함수 추가
- [x] 특정 Trip의 참여자 목록 조회
- **완료 기준**: Trip 상세 페이지에서 참여자 목록 표시

---

### Phase 5 Plan Mode Build 상세 작업 내역

#### Server Actions 구현
- [x] `actions/invitations.ts`에 `getInvitationById` 함수 추가
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회 (요청자)
  - [x] 초대 조회 및 소유자 확인
  - [x] 픽업 요청 정보 JOIN (초대 수락 후 정확한 주소/좌표 포함)
  - [x] Trip 정보 JOIN (제공자 정보는 제외)
  - [x] 만료된 PENDING 초대 자동 EXPIRED 처리
  - [x] 에러 처리 및 사용자 친화적 메시지
  - [x] 상세한 로깅 (console.group, console.log)

- [x] `actions/invitations.ts`에 `acceptInvitation` 함수 추가
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회 (요청자)
  - [x] 초대 조회 및 소유자 확인
  - [x] 초대 `status = 'PENDING'` 확인
  - [x] `expires_at` 만료 여부 확인
  - [x] Trip 조회 및 `is_locked = false` 확인
  - [x] Trip `capacity` 초과 여부 확인 (`trip_participants` COUNT)
  - [x] 요청자 PENDING 초대 1개 조건 확인 (DB unique index 활용)
  - [x] 트랜잭션 처리:
    1. [x] `invitations.status = 'ACCEPTED'`, `responded_at` 업데이트
    2. [x] `trip_participants`에 INSERT (sequence_order 포함)
    3. [x] `pickup_requests.status = 'MATCHED'` 업데이트
  - [x] 에러 발생 시 롤백 처리
  - [x] 에러 처리 및 사용자 친화적 메시지
  - [x] 상세한 로깅 (console.group, console.log)
  - [x] 캐시 무효화 (revalidatePath)

- [x] `actions/invitations.ts`에 `rejectInvitation` 함수 추가
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회 (요청자)
  - [x] 초대 조회 및 소유자 확인
  - [x] 초대 `status = 'PENDING'` 확인
  - [x] `expires_at` 만료 여부 확인 (만료된 초대도 거절 가능)
  - [x] `invitations.status = 'REJECTED'`, `responded_at` 업데이트
  - [x] 에러 처리 및 사용자 친화적 메시지
  - [x] 상세한 로깅 (console.group, console.log)
  - [x] 캐시 무효화 (revalidatePath)

- [x] `actions/trips.ts`에 `getTripParticipants` 함수 추가
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회
  - [x] Trip 조회 및 소유자 확인 (제공자만 조회 가능)
  - [x] `trip_participants` 조회 (픽업 요청 정보 JOIN)
  - [x] 참여자 목록 반환 (sequence_order 포함)
  - [x] 에러 처리 및 사용자 친화적 메시지
  - [x] 상세한 로깅 (console.group, console.log)

#### 초대 수락/거절 버튼 컴포넌트 생성
- [x] `components/invitations/accept-reject-buttons.tsx` 생성
  - [x] Client Component로 구현
  - [x] `acceptInvitation`, `rejectInvitation` Server Action 호출
  - [x] 로딩 상태 관리
  - [x] 에러 메시지 표시
  - [x] 성공 시 페이지 새로고침 (router.refresh)
  - [x] PENDING 상태가 아니면 버튼 표시 안 함
  - [x] 만료된 초대 처리

#### 초대 상세 페이지 UI 생성
- [x] `app/(routes)/invitations/[invitationId]/page.tsx` 생성
  - [x] Server Component로 구현
  - [x] `dynamic = 'force-dynamic'` 추가
  - [x] `getInvitationById` Server Action import 및 호출
  - [x] 초대 소유자 확인 및 에러 처리
  - [x] 초대 상세 정보 표시:
    - [x] 초대 상태 배지 (PENDING, ACCEPTED, REJECTED, EXPIRED)
    - [x] 초대 일시, 만료 시간, 응답 일시
    - [x] 픽업 요청 정보 (초대 수락 후 정확한 주소/좌표 공개 - PRD 규칙)
    - [x] Trip 정보 (제공자 정보는 제외)
  - [x] `AcceptRejectButtons` 컴포넌트 연결 (PENDING 상태일 때만 표시)
  - [x] 초대 상태별 메시지 표시
  - [x] 에러 처리 (초대 없음, 만료됨, 이미 응답함 등)
  - [x] "픽업 요청 목록으로" 버튼 제공

### Phase 5 실행 확인
```sql
-- 초대 수락 후 실행
SELECT * FROM public.invitations WHERE id = 'invitation_xxx';  -- status = 'ACCEPTED' 확인
SELECT * FROM public.trip_participants WHERE trip_id = 'trip_xxx';  -- 참여자 확인
SELECT status FROM public.pickup_requests WHERE id = 'request_xxx';  -- status = 'MATCHED' 확인

-- capacity 초과 수락 시도 시 에러 발생 확인 (3명 초과 시도)
```
- [x] 쿼리 결과로 모든 상태 업데이트 확인
- [x] capacity 초과 시도 시 에러 발생 확인

---

## Phase 6: 출발(LOCK) 처리

### Task 6.1: 출발 버튼 UI
- [x] `app/(routes)/trips/[tripId]/page.tsx` 생성 또는 수정
- [x] Trip 상세 페이지에 출발 버튼 추가
- [x] 출발 가능 조건 표시 (참여자 존재, `is_locked = false`)
- **완료 기준**: 출발 버튼 표시 및 클릭 가능

### Task 6.2: 출발(LOCK) Server Action
- [x] `actions/trips.ts`에 `startTrip` 함수 추가
- [x] **서버 검증 필수**:
  - Trip `is_locked = false` 확인
  - Trip에 참여자 존재 확인 (`trip_participants` COUNT > 0)
- [x] 트랜잭션 처리:
  1. Trip `is_locked = true`, `status = 'IN_PROGRESS'`, `start_at` 업데이트
  2. 남아있는 모든 `PENDING` 초대를 `EXPIRED` 처리
  3. 관련 `pickup_requests.status = 'IN_PROGRESS'` 업데이트
- [x] 에러 처리
- **완료 기준**: 출발 시 Trip LOCK, 남은 초대 EXPIRED, 요청 상태 업데이트

---

### Phase 6 Plan Mode Build 상세 작업 내역

#### Server Action 구현
- [x] `actions/trips.ts`에 `startTrip` 함수 추가
  - [x] Clerk 인증 확인
  - [x] Profile ID 조회 (clerk_user_id 기준)
  - [x] Trip 조회 및 소유자 확인
  - [x] Trip `is_locked = false` 확인
  - [x] Trip에 참여자 존재 확인 (`trip_participants` COUNT > 0)
  - [x] 트랜잭션 처리 (순차 실행):
    1. [x] Trip 업데이트: `is_locked = true`, `status = 'IN_PROGRESS'`, `start_at = now()`
    2. [x] 남아있는 모든 `PENDING` 초대를 `EXPIRED` 처리 (`invitations` 테이블)
    3. [x] 관련 `pickup_requests.status = 'IN_PROGRESS'` 업데이트 (Trip 참여자의 픽업 요청)
  - [x] 에러 처리 및 사용자 친화적 메시지
  - [x] 상세한 로깅 (console.group, console.log)
  - [x] 캐시 무효화 (revalidatePath)

#### 출발 버튼 컴포넌트 생성
- [x] `components/trips/start-trip-button.tsx` 생성
  - [x] Client Component로 구현
  - [x] `startTrip` Server Action 호출
  - [x] 로딩 상태 관리
  - [x] 에러 메시지 표시
  - [x] 성공 시 페이지 새로고침 (router.refresh)
  - [x] 출발 불가 조건 시 버튼 비활성화 및 안내 메시지
  - [x] Props: `tripId`, `isLocked`, `participantCount`

#### Trip 상세 페이지 생성
- [x] `app/(routes)/trips/[tripId]/page.tsx` 생성
  - [x] Server Component로 구현
  - [x] `dynamic = 'force-dynamic'` 추가
  - [x] `getTripById` Server Action import 및 호출
  - [x] `getTripParticipants` Server Action import 및 호출
  - [x] Trip 소유자 확인 및 에러 처리
  - [x] Trip 상세 정보 표시:
    - [x] Trip 상태 배지
    - [x] LOCK 상태 표시
    - [x] 수용 인원 및 현재 참여자 수
    - [x] 출발 시간 (LOCK된 경우)
  - [x] 참여자 목록 표시:
    - [x] 각 참여자의 픽업 요청 정보 (시간, 출발지, 목적지)
    - [x] `sequence_order` 순서대로 표시
  - [x] `StartTripButton` 컴포넌트 연결
  - [x] 출발 가능 조건 표시 (참여자 존재, `is_locked = false`)
  - [x] LOCK된 경우 "이미 출발했습니다" 메시지
  - [x] 에러 처리 (Trip 없음, 소유자 아님 등)

#### 네비게이션 연결
- [x] `app/(routes)/trips/page.tsx` 수정
  - [x] 각 Trip 카드에 "상세 보기" 링크 추가 (`/trips/[tripId]`)
  - [x] LOCK된 Trip은 별도 표시

### Phase 6 실행 확인

#### 1. 출발 처리 후 데이터베이스 확인
```sql
-- 출발 후 실행 (trip_xxx를 실제 Trip ID로 변경)
SELECT is_locked, status, start_at FROM public.trips WHERE id = 'trip_xxx';  
-- 예상 결과: is_locked = true, status = 'IN_PROGRESS', start_at이 현재 시간으로 설정됨

-- PENDING 초대가 모두 EXPIRED 처리되었는지 확인
SELECT id, status, expires_at 
FROM public.invitations 
WHERE trip_id = 'trip_xxx' AND status = 'PENDING';  
-- 예상 결과: 결과 없어야 함 (모두 EXPIRED로 변경됨)

-- 관련 픽업 요청 상태가 IN_PROGRESS로 업데이트되었는지 확인
SELECT id, status, pickup_time, origin_text, destination_text
FROM public.pickup_requests 
WHERE id IN (
  SELECT pickup_request_id 
  FROM trip_participants 
  WHERE trip_id = 'trip_xxx'
);  
-- 예상 결과: 모든 참여자의 pickup_requests.status = 'IN_PROGRESS'
```

#### 2. 코드 레벨 확인 사항
- [x] `startTrip` 함수에서 Trip 업데이트 로직 구현 확인
  - 코드 위치: `actions/trips.ts` 545-563줄
  - 업데이트 내용: `is_locked = true`, `status = 'IN_PROGRESS'`, `start_at = now()`
- [x] `startTrip` 함수에서 PENDING 초대 EXPIRED 처리 로직 구현 확인
  - 코드 위치: `actions/trips.ts` 565-584줄
  - 처리 내용: `invitations.status = 'EXPIRED'` (WHERE `trip_id` AND `status = 'PENDING'`)
- [x] `startTrip` 함수에서 픽업 요청 상태 업데이트 로직 구현 확인
  - 코드 위치: `actions/trips.ts` 586-610줄
  - 업데이트 내용: 참여자의 `pickup_requests.status = 'IN_PROGRESS'`
- [x] `acceptInvitation` 함수에서 LOCK 확인 로직 구현 확인
  - 코드 위치: `actions/invitations.ts` 772-780줄
  - 검증 내용: `trip.is_locked = true`인 경우 에러 반환
- [x] `sendInvitation` 함수에서 LOCK 확인 로직 구현 확인
  - 코드 위치: `actions/invitations.ts` 111-120줄
  - 검증 내용: `trip.is_locked = true`인 경우 에러 반환

#### 3. 실제 테스트 시나리오
1. **출발 처리 테스트**:
   - 제공자 계정으로 로그인
   - Trip 생성 및 참여자 초대 수락 대기
   - 참여자가 초대 수락 (최소 1명)
   - Trip 상세 페이지(`/trips/[tripId]`) 접근
   - "출발하기" 버튼 클릭
   - 위 SQL 쿼리로 상태 업데이트 확인

2. **LOCK 후 초대 수락 불가 테스트**:
   - 출발 처리 완료 후 (Trip LOCK됨)
   - 요청자 계정으로 로그인
   - PENDING 상태인 초대가 있다면 초대 상세 페이지 접근
   - "수락하기" 버튼 클릭 시도
   - 예상 결과: "이 Trip은 이미 출발했습니다. 초대를 수락할 수 없습니다." 에러 메시지
   - 코드 위치: `actions/invitations.ts` 772-780줄

3. **LOCK 후 초대 전송 불가 테스트**:
   - 출발 처리 완료 후 (Trip LOCK됨)
   - 제공자 계정으로 로그인
   - 초대 페이지(`/trips/[tripId]/invite`) 접근
   - "초대하기" 버튼 클릭 시도
   - 예상 결과: "이 Trip은 이미 출발했습니다. 초대를 보낼 수 없습니다." 에러 메시지
   - 코드 위치: `actions/invitations.ts` 111-120줄

#### 4. 확인 완료 체크
- [ ] 쿼리 결과로 모든 상태 업데이트 확인
- [ ] LOCK 후 초대 수락 시도 시 에러 발생 확인
- [ ] LOCK 후 초대 전송 시도 시 에러 발생 확인

---

## Phase 7: 도착 사진 업로드 (trip_arrivals)

### Task 7.1: 도착 사진 업로드 UI
- [ ] `app/(routes)/trips/[tripId]/arrive/page.tsx` 생성
- [ ] 사진 업로드 컴포넌트 (Supabase Storage 연동)
- [ ] 각 참여자별 도착 사진 업로드
- **완료 기준**: 사진 선택 및 업로드 가능

### Task 7.2: 도착 사진 업로드 Server Action
- [ ] `actions/trip-arrivals.ts` 생성
- [ ] `uploadArrivalPhoto` 함수 구현
  - Supabase Storage에 파일 업로드
  - `trip_arrivals` 테이블에 INSERT (`photo_path` 저장)
  - 관련 `pickup_requests.status = 'ARRIVED'` 업데이트
  - Trip `status = 'ARRIVED'` 업데이트 (모든 참여자 도착 시)
- [ ] 에러 처리
- **완료 기준**: 사진 업로드 시 DB 레코드 생성, 요청 상태 업데이트

### Task 7.3: 도착 사진 조회
- [ ] `actions/trip-arrivals.ts`에 `getTripArrivals` 함수 추가
- [ ] 특정 Trip의 도착 사진 목록 조회
- **완료 기준**: 도착 사진 목록 화면에 표시

### Phase 7 실행 확인
```sql
-- 도착 사진 업로드 후 실행
SELECT * FROM public.trip_arrivals WHERE trip_id = 'trip_xxx';  -- 사진 레코드 확인
SELECT status FROM public.pickup_requests WHERE id = 'request_xxx';  -- status = 'ARRIVED' 확인
SELECT status FROM public.trips WHERE id = 'trip_xxx';  -- 모든 참여자 도착 시 status = 'ARRIVED' 확인
```
- [ ] 쿼리 결과로 모든 상태 업데이트 확인
- [ ] 화면에서 도착 사진 표시 확인

---

## Phase 8: 리뷰 및 완료 처리 (trip_reviews)

### Task 8.1: 리뷰 작성 UI
- [ ] `app/(routes)/trips/[tripId]/review/page.tsx` 생성
- [ ] 리뷰 폼 (평점 1~5, 코멘트)
- [ ] `status = 'ARRIVED'`인 요청만 리뷰 가능
- **완료 기준**: 리뷰 작성 폼 표시 및 제출 가능

### Task 8.2: 리뷰 제출 Server Action
- [ ] `actions/trip-reviews.ts` 생성
- [ ] `submitReview` 함수 구현
  - `trip_reviews` 테이블에 INSERT
  - 관련 `pickup_requests.status = 'COMPLETED'` 업데이트
  - Trip `status = 'COMPLETED'` 업데이트 (모든 참여자 리뷰 완료 시)
- [ ] 에러 처리
- **완료 기준**: 리뷰 제출 시 DB 레코드 생성, 요청 상태 업데이트

### Task 8.3: 자동 완료 처리 (24시간 후)
- [ ] `actions/trip-reviews.ts`에 `autoCompleteArrivedRequests` 함수 추가
- [ ] `status = 'ARRIVED'`이고 `created_at`이 24시간 경과한 요청 자동 `COMPLETED` 처리
- [ ] Cron Job 또는 별도 스케줄러 설정 (선택사항, MVP에서는 수동 실행 가능)
- **완료 기준**: 24시간 경과 후 자동 완료 처리 (또는 수동 실행 가능)

### Task 8.4: 리뷰 조회
- [ ] `actions/trip-reviews.ts`에 `getTripReviews` 함수 추가
- [ ] 특정 Trip의 리뷰 목록 조회
- [ ] 제공자 평균 평점 계산
- **완료 기준**: 리뷰 목록 및 평균 평점 화면에 표시

### Phase 8 실행 확인
```sql
-- 리뷰 제출 후 실행
SELECT * FROM public.trip_reviews WHERE trip_id = 'trip_xxx';  -- 리뷰 레코드 확인
SELECT status FROM public.pickup_requests WHERE id = 'request_xxx';  -- status = 'COMPLETED' 확인
SELECT status FROM public.trips WHERE id = 'trip_xxx';  -- 모든 참여자 리뷰 완료 시 status = 'COMPLETED' 확인

-- 자동 완료 확인 (24시간 경과 후)
SELECT id, status, created_at 
FROM public.pickup_requests 
WHERE status = 'ARRIVED' 
  AND created_at < now() - interval '24 hours';
```
- [ ] 쿼리 결과로 모든 상태 업데이트 확인
- [ ] 화면에서 리뷰 목록 및 평균 평점 표시 확인

---

## Phase 9: 취소/노쇼 처리

### Task 9.1: 취소 UI
- [ ] `app/(routes)/pickup-requests/[requestId]/cancel/page.tsx` 생성
- [ ] 취소 사유 입력 폼 (`cancel_reason_code`: CANCEL/NO_SHOW, `cancel_reason_text`)
- [ ] 취소 가능 조건 표시 (`status`가 `IN_PROGRESS` 이전)
- **완료 기준**: 취소 폼 표시 및 제출 가능

### Task 9.2: 취소 Server Action
- [ ] `actions/pickup-requests.ts`에 `cancelPickupRequest` 함수 추가
- [ ] **서버 검증 필수**:
  - `status`가 `IN_PROGRESS` 이전인지 확인
- [ ] `pickup_requests.status = 'CANCELLED'`, `cancel_reason_code`, `cancel_reason_text` 업데이트
- [ ] 관련 초대가 있으면 `EXPIRED` 처리
- [ ] 관련 `trip_participants` 삭제 (선택사항, 또는 상태만 업데이트)
- **완료 기준**: 취소 시 상태 업데이트, 관련 초대/참여자 처리

### Phase 9 실행 확인
```sql
-- 취소 후 실행
SELECT status, cancel_reason_code, cancel_reason_text 
FROM public.pickup_requests 
WHERE id = 'request_xxx';  -- status = 'CANCELLED' 확인
```
- [ ] 쿼리 결과로 취소 상태 확인
- [ ] 화면에서 취소된 요청 표시 확인

---

## Phase 10: 통합 테스트 및 검증

### Task 10.1: 전체 플로우 테스트
- [ ] 요청자: 픽업 요청 등록 → 초대 수락 → 도착 확인 → 리뷰 제출
- [ ] 제공자: Trip 생성 → 초대 전송 → 출발(LOCK) → 도착 사진 업로드
- [ ] 에러 케이스 테스트 (중복 초대, capacity 초과, LOCK 후 수락 등)
- **완료 기준**: 전체 플로우 정상 동작, 에러 케이스 적절히 처리

### Task 10.2: 상태 전이 검증
- [ ] 모든 상태 전이가 PRD Section 4 규칙을 따르는지 확인
- [ ] DB 제약 조건 위반 시 에러 발생 확인
- [ ] 서버 검증 로직 동작 확인
- **완료 기준**: 모든 상태 전이 규칙 준수 확인

### Task 10.3: 모바일 웹 UX 검증
- [ ] 모바일 기기에서 전체 플로우 테스트
- [ ] 반응형 디자인 확인
- [ ] 터치 인터랙션 확인
- **완료 기준**: 모바일에서 모든 기능 정상 동작

### Phase 10 실행 확인
- [ ] 전체 플로우 수동 테스트 완료
- [ ] 에러 케이스 테스트 완료
- [ ] 모바일 UX 검증 완료

---

## 참고사항

### 개발 시 주의사항
- 모든 상태 전이는 Server Action에서만 수행
- DB 제약 조건을 우회하지 말고, 위반 시 에러를 그대로 처리
- 초대/LOCK/capacity 규칙은 PRD Section 4를 최우선으로 따름
- 에러 메시지는 사용자 친화적으로 작성

### 다음 단계 (v1.1+)
- 관리자 승인 시스템 (제공자 인증)
- 마이페이지 이력 조회
- 푸시 알림 연동
- 결제 시스템 (v2)
