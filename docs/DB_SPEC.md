# DB_SPEC.md (Boilerplate-Safe / Clerk + Supabase / Cursor용)

> ✅ 목적  
> - 이 문서는 Supabase(Postgres)에 생성될 데이터 모델의 단일 기준(Single Source of Truth)이다.  
> - 본 프로젝트는 nextjs-supabase-boilerplate(Clerk + Supabase 통합)를 사용한다.  
> - 기존 보일러플레이트 스키마/트리거와 충돌하지 않도록 “확장(ALTER) 우선” 원칙을 따른다.  
> - SQL 작성은 Cursor에서 진행하며, Cursor는 아래 충돌 방지 규칙을 반드시 준수해야 한다.

---

## 0. 충돌 방지 규칙 (가장 중요)

### 0.1 보일러플레이트 전제 (고정)
- 인증은 Clerk가 담당한다.
- Supabase Auth의 auth.users를 직접 사용하지 않는다.
- Supabase 접근 패턴:
  - Client: useClerkSupabaseClient
  - Server: createClerkSupabaseClient
  - Admin: createServiceRoleClient

### 0.2 절대 하지 말 것 (SQL 작성 시 금지)
- profiles 테이블을 CREATE TABLE로 새로 만들지 않는다.
- updated_at 공용 함수/트리거를 재생성하지 않는다.
- auth.users 기준 FK 생성 금지.
- 클라이언트에서 상태 전이(Trip/Invitation/Request)를 직접 UPDATE하도록 설계 금지.
- (MVP) 결제/광고 관련 테이블 생성 금지.

### 0.3 반드시 할 것
- profiles 존재 여부 확인 후:
  - 있으면 ALTER TABLE
  - 없으면 Clerk 기반 최소 컬럼으로 CREATE
- 초대/정원/LOCK 제약은 DB 레벨에서 강제
- Trip 상태 enum과 Invitation 상태 분리
- 요청자는 동시에 PENDING 초대 1개만 허용 (partial unique)

---

## 1. 핵심 엔티티 개요 (MVP v1.0)

### 1.1 profiles (학부모)
- 인증 주체: Clerk userId
- 사용자 데이터는 profiles 테이블에 저장

권장 구조:
- id (uuid, PK)
- clerk_user_id (text, UNIQUE, NOT NULL)
- created_at, updated_at

⚠️ profiles.id = clerk_user_id(TEXT PK) 구조는 확장성 문제로 비권장

---

## 2. 테이블 스펙 (MVP)

### 2.1 pickup_requests (요청서)

역할:
- 요청자가 픽업 요청을 등록하는 단위 데이터

필드:
- id (uuid, PK)
- requester_profile_id (uuid, FK → profiles.id, NN)
- pickup_time (timestamptz, NN)
- origin_text (text, NN)
- origin_lat / origin_lng (numeric, NN)
- destination_text (text, NN)
- destination_lat / destination_lng (numeric, NN)
- status (ENUM request_status, NN)
  - REQUESTED, MATCHED, IN_PROGRESS, ARRIVED, COMPLETED, CANCELLED
- cancel_reason_code (text, nullable) — CANCEL / NO_SHOW
- cancel_reason_text (text, nullable)
- created_at, updated_at

규칙:
- 상태 전이는 서버/DB에서만 수행
- 노쇼/취소는 CANCELLED + reason_code로 구분

---

### 2.2 trips (픽업 세션)

역할:
- 제공자 1회 출발 단위
- 최대 3명 수용

필드:
- id (uuid, PK)
- provider_profile_id (uuid, FK → profiles.id, NN)
- capacity (int, NN, default 3)
- is_locked (boolean, NN, default false)
- status (ENUM trip_status, NN)
  - OPEN, IN_PROGRESS, ARRIVED, COMPLETED, CANCELLED
- start_at, arrived_at, completed_at (timestamptz)
- created_at, updated_at

규칙:
- is_locked=true 시 초대/수락 불가
- capacity 초과 수락 DB 차단 필수

---

### 2.3 invitations (초대)

역할:
- 제공자가 요청자에게 보내는 초대 단위

필드:
- id (uuid, PK)
- trip_id (uuid, FK → trips.id, NN)
- pickup_request_id (uuid, FK → pickup_requests.id, NN)
- provider_profile_id (uuid, FK → profiles.id, NN)
- requester_profile_id (uuid, FK → profiles.id, NN)
- status (ENUM invitation_status, NN)
  - PENDING, ACCEPTED, REJECTED, EXPIRED
- expires_at (timestamptz, NN)
- responded_at (timestamptz, nullable)
- created_at

규칙:
- 요청자는 동시에 PENDING 초대 1개만 가능
- 수락 인원 < capacity 일 때만 초대 가능
- 생성 후 FK 변경 불가 (immutable 권장)

---

### 2.4 trip_participants (Trip ↔ Request 매핑)

역할:
- Trip에 포함된 요청자 목록 관리

필드:
- id (uuid, PK)
- trip_id (uuid, FK → trips.id, NN)
- pickup_request_id (uuid, FK → pickup_requests.id, NN, UNIQUE)
- requester_profile_id (uuid, FK → profiles.id, NN)
- sequence_order (int, nullable)
- created_at

규칙:
- Trip 참여 인원 ≤ capacity
- pickup_request는 하나의 Trip에만 포함 가능

---

### 2.5 trip_arrivals (도착 인증)

필드:
- id (uuid, PK)
- trip_id (uuid, FK → trips.id, NN)
- pickup_request_id (uuid, FK → pickup_requests.id, NN)
- photo_path (text, NN)
- created_at

---

### 2.6 trip_reviews (평가)

필드:
- id (uuid, PK)
- trip_id (uuid, FK → trips.id, NN)
- pickup_request_id (uuid, FK → pickup_requests.id, NN)
- reviewer_profile_id (uuid, FK → profiles.id, NN)
- provider_profile_id (uuid, FK → profiles.id, NN)
- rating (int, NN, 1~5)
- comment (text, nullable)
- created_at

규칙:
- pickup_request 당 1회 평가 권장
- ARRIVED 후 24시간 경과 시 자동 COMPLETED 가능

---

## 3. ENUM 목록

- request_status:
  REQUESTED, MATCHED, IN_PROGRESS, ARRIVED, COMPLETED, CANCELLED
- trip_status:
  OPEN, IN_PROGRESS, ARRIVED, COMPLETED, CANCELLED
- invitation_status:
  PENDING, ACCEPTED, REJECTED, EXPIRED

---

## 4. 핵심 제약 / 인덱스

- invitations:
  - requester_profile_id 기준 PENDING 1개 제한 (partial unique)
- trip_participants:
  - pickup_request_id UNIQUE
- pickup_requests:
  - requester_profile_id + pickup_time 인덱스 권장

---

## 5. 서버/DB 강제 로직 요약

- 초대 수락 시:
  - PENDING 여부
  - 만료 여부
  - Trip LOCK 여부
  - capacity 초과 여부
  - 요청자 PENDING 초대 1개 조건
- 출발 시:
  - Trip LOCK
  - 남은 PENDING 초대 EXPIRED
  - 요청 상태 IN_PROGRESS
- 도착:
  - 사진 업로드
  - ARRIVED 처리
- 완료:
  - 평가 제출 또는 24시간 자동 COMPLETED

---

## 6. 보안 원칙

- 핵심 상태 전이는 서버/서비스 롤만 가능
- 클라이언트는 읽기 중심
- 파일은 Storage, DB에는 경로만 저장
- 인증 서류는 관리자만 접근

---

## 7. Post-Launch 확장 (요약)

- v2: 결제, 광고, 실시간 위치
- v3+: 학원/지역 기반 확장

---

## 8. Cursor SQL 생성 지시문 (복붙용)

- auth.users 사용 금지
- profiles는 CREATE 금지, ALTER 우선
- updated_at 공용 트리거 재생성 금지
- pickup_requests, trips, invitations, trip_participants,
  trip_arrivals, trip_reviews 생성
- PENDING 초대 1개 제한 partial unique 적용
- Trip capacity=3, LOCK 이후 수락 불가 강제
