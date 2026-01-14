# IMPLEMENTED_REGISTRY.md
> 목적: 프로젝트 전반에서 “이미 구현된 기능”을 빠르게 확인하고,
> 같은 기능을 중복 구현하여 코드가 꼬이는 일을 방지한다.
> PLAN MODE로 기능 구현 계획을 세울 때 반드시 본 문서를 먼저 확인한다.

---

## 사용 규칙 (Plan Mode 체크리스트)
새 기능을 구현하기 전, 아래 5단계를 반드시 수행한다.

1) **기능 키워드로 검색**
- 코드 검색: (예) cancel, no-show, invite, group, started, arrived, message
- 라우트 검색: app/(routes) 하위 페이지들
- actions 검색: actions/*.ts

2) **이미 구현 여부 판단**
- UI만 있음 / 서버 액션 있음 / DB 반영 있음 중 어디까지 되어있는지 분류한다.

3) **중복 방지 결론을 문서에 기록**
- “이미 구현됨 → 보완만” 또는 “없음 → 신규 구현”으로 명확히 적는다.

4) **PR 단위(커밋 단위)로 기능을 분리**
- 서로 다른 기능을 한 커밋에 섞지 않는다.

5) **작업 완료 후, 반드시 이 문서를 업데이트**
- 구현 완료 시: 상태를 ✅로 바꾸고, 파일 경로/엔드포인트/상태값을 기록한다.

---

## 상태 표기 규칙
- ✅ Done: UI + 서버 + DB까지 동작 확인
- 🟡 Partial: 일부만 구현(보완 필요)
- 🔴 Not Started: 미구현
- ⚠️ Deprecated: 더 이상 쓰지 않음(대체 경로/로직 명시)

---

# 1) 전역 공통 규칙/정책
## 1.1 상태(Status) 표준
- 🟡 Status 표준 정의 문서: (여기에 실제 사용 status 목록을 적기)
  - pickup_request.status:
  - pickup_group.status:
  - invite.status:
- 관련 파일:
  - (예) lib/constants/status.ts
  - (예) actions/*

## 1.2 시간/만료 정책
- 🔴 그룹 만료(EXPIRED) 처리:
  - 규칙:
  - 적용 위치:
- 🔴 초대/수락 제한(LOCK, 3명 제한 등):
  - 규칙:
  - 적용 위치:

---

# 2) 기능 레지스트리 (이미 구현된 기능 목록)

## 2.1 인증/로그인
- ✅ Clerk 기본 로그인 동작
  - 경로/설정:
- 🟡 Google 로그인(인앱 브라우저 제한 안내 필요)
  - 안내 문구 위치:
  - 이슈: Kakao in-app에서 disallowed_useragent

---

## 2.2 픽업 요청 (Requester)
### 2.2.1 픽업 요청 생성
- 🟡 구현 상태:
- UI 경로:
- 서버 액션:
- DB 테이블/필드:

### 2.2.2 픽업 요청 상세 보기
- ✅ 구현 상태:
- UI 경로: app/(routes)/pickup-requests/[requestId]/page.tsx
- 주요 컴포넌트:
- 비고:

### 2.2.3 픽업 요청 취소 (Cancel)
- ✅ 구현 상태: 취소 플로우 선행 구현됨 (중복 구현 금지)
- UI 경로:
  - app/(routes)/pickup-requests/[requestId]/cancel/ ...
- 컴포넌트:
  - components/pickup-requests/cancel-form.tsx
  - components/pickup-requests/cancel-pickup-request-button.tsx
  - components/pickup-requests/cancel-request-button.tsx
- 서버 액션:
  - actions/pickup-requests.ts (취소 관련 함수)
  - actions/pickup-cancel.ts (취소 요청 및 승인)
- 검증/밸리데이션:
  - lib/validations/pickup-request.ts
- 상태 전이:
  - REQUESTED → CANCELLED (자동 승인)
  - MATCHED (출발 1시간 이전) → CANCELLED (자동 승인)
  - MATCHED (출발 1시간 이내) → CANCEL_REQUESTED → CANCELLED (제공자 승인 필요)
- 남은 보완:
  - (예) 상태 전이 정책 확정
  - (예) STARTED 이후 취소 제한 서버 강제

---

## 2.3 픽업 제공 (Provider)
### 2.3.1 픽업 그룹 생성(이름 지정)
- 🟡 구현 상태:
- UI 경로:
- 서버 액션:
- DB:

### 2.3.2 초대하기(요청자 목록에서 초대)
- 🟡 구현 상태:
- 초대 제한:
  - 같은 그룹 최대 3명(수락+대기 합산)
  - 날짜 불일치 초대 금지(예정)
- UI 경로:
- 서버 액션:

### 2.3.3 그룹 잠금(LOCK) / 마감 규칙
- 🟡 구현 상태:
- 트리거:
  - 3명 찼을 때
  - 출발 30분 전
  - 출발 버튼 클릭 시
- 서버에서 강제 여부:

### 2.3.4 그룹 만료(EXPIRED)
- 🔴 구현 상태:
- 규칙:
  - 출발 시간이 지났는데 STARTED가 아니면 EXPIRED
- 적용 위치:
  - 목록 조회 시
  - 상세 조회 시
  - 주요 액션 진입 시

### 2.3.5 제공자 취소 승인 (Cancel Approval)
- ✅ 구현 상태: 제공자 픽업 그룹 상세 페이지에서 취소 요청 표시 및 승인 기능
- UI 경로:
  - app/(routes)/trips/[tripId]/page.tsx (Trip 상세 페이지)
- 컴포넌트:
  - components/pickup-requests/approve-cancel-button.tsx
- 서버 액션:
  - actions/pickup-cancel.ts (approveCancel 함수)
- 상태 표시:
  - pickup_request.status = 'CANCEL_REQUESTED'일 때 "취소 요청됨" 배지 표시
  - ApproveCancelButton 컴포넌트 표시 (승인 버튼)
- 승인 플로우:
  1. 요청자가 출발 1시간 이내 취소 요청 → status = 'CANCEL_REQUESTED'
  2. 제공자가 Trip 상세 페이지에서 취소 요청 확인
  3. 제공자가 승인 버튼 클릭 → approveCancel Server Action 호출
  4. status = 'CANCELLED'로 업데이트, trip_participants 삭제 (capacity 복구)
- 시간 제한 로직:
  - 출발 1시간 전까지: "확인" 버튼 (자동 승인)
  - 출발 1시간 이내: "취소 승인" 버튼 (수동 승인 필요)

---

## 2.4 마이페이지(My)
### 2.4.1 내가 신청한 픽업 요청 탭
- 🟡 구현 상태:
- UI 경로:
- 필터 기준(status):
- 비고:

### 2.4.2 내가 제공중인 픽업 탭
- 🟡 구현 상태:
- UI 경로:
- 매칭 카드 구성:
- 비고:

### 2.4.3 지난 픽업 요청 / 지난 픽업 제공
- 🔴 구현 상태:
- 포함 status:
- UI 경로:

---

## 2.5 메시지(비실시간 메시지)
### 2.5.1 매칭별 메시지 작성 버튼
- 🟡 구현 상태:
- 위치: 제공/요청 상세 카드 내
- 서버 액션:
- DB:

### 2.5.2 읽지 않은 메시지 배지(unread count)
- 🔴 구현 상태:
- 추천 설계:
  - pickup_message_reads 테이블( invite_id + user_id + last_read_at )
- 표시 위치:
  - “메시지 작성” 버튼 오른쪽 배지
- 읽음 처리:
  - 스레드 열 때 markAsRead

---

# 3) 중복 구현 방지 가이드 (실전)
## 3.1 “이미 구현된 기능”을 발견했을 때
- ✅ 신규 기능으로 만들지 않는다.
- 대신 아래 중 하나로 처리한다:
  1) **보완(Enhancement)**: 기존 코드 재사용 + 조건/정책만 추가
  2) **리팩터(Refactor)**: 파일/함수 정리(동작 동일)
  3) **대체(Replace)**: 기존 기능을 deprecated 처리하고 새 구현으로 교체

## 3.2 중복 구현 체크 질문 (Plan Mode에서 반드시 답하기)
- 이 기능과 유사한 UI/버튼/페이지가 이미 존재하는가?
- 서버 액션(생성/취소/수락/출발/도착) 함수가 이미 있는가?
- DB에 이미 해당 상태/필드/테이블이 있는가?
- “상태 전이”가 기존과 충돌하지 않는가?
- 기존 구현을 확장하면 해결 가능한가?

---

# 4) 변경 로그 (선택)
> “언제 어떤 기능이 선행 구현되었는지” 기록용
- YYYY-MM-DD: 픽업 요청 취소 플로우 선행 구현 완료
- 2025-01-14: 제공자 취소 승인 기능 구현 완료 (Trip 상세 페이지에서 CANCEL_REQUESTED 상태 표시 및 승인 버튼)
