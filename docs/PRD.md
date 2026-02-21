# 우리아이 픽업이모 (MVP v1.0 PRD)
-- Cursor 개발용 / 코드 꼬임 최소화 버전 (Single Source of Truth)

> 📌 PRD 사용 원칙 (개발 고정 규칙)
> - 이 문서는 Cursor에서 실제 개발 시 기준이 되는 단일 기준 문서이다.
> - MVP v1.0 개발 중에는 이 문서의 규칙을 변경하지 않는다.
> - 기능 추가/정책 변경은 Post-Launch Plan에만 기록한다.
> - 구현이 헷갈릴 경우 "Trip / Invitation / 상태 전이 규칙"을 최우선으로 따른다.

---

## 1. Overview

### Problem Statement

**문제 정의**  
맞벌이 가정의 학부모는 초등학교 자녀의 하교 및 학원 이동을 직접 담당하지 못하는 상황에서 지속적인 스트레스와 불안감을 겪고 있다.  
반면, 같은 학교에 자녀를 둔 일부 학부모는 상대적으로 여유가 있음에도 이를 활용할 안전하고 신뢰 가능한 공식 채널이 없다.

**왜 중요한가**  
아동의 이동 안전은 타협할 수 없는 문제이며, 특히 초등학생의 하교 시간대는 보호 공백이 자주 발생한다.  
이로 인한 불안은 부모의 삶의 질과 직결되며, 장기적으로는 직장 유지·출산·육아 결정에도 영향을 준다.

**타겟 고객**  
- 요청자: 초등학교 자녀를 둔 맞벌이 학부모  
- 제공자: 부가 소득 또는 지역 활동 목적의 동일 학교 학부모

**핵심 전제/가정**  
- 같은 학교 학부모 간 신뢰는 외부인보다 높다  
- 사진 인증 + 상태 공유만으로도 불안은 충분히 감소한다  
- MVP에서는 자동화보다 **명확한 규칙과 안정성**이 우선이다

---

## 2. Proposed Work

### 솔루션 개요

본 서비스는 **제공자 초대 기반 단방향 매칭**으로 운영되는  
초등학교 학부모 전용 픽업 웹앱(Web App) 플랫폼이다.

MVP 범위:
- 실시간 위치 공유 ❌
- 지도 기반 출발지·목적지 검색 및 좌표 저장 ⭕
- 모바일 웹앱 형태로 제공 ⭕

---

### 핵심 기능

- 픽업 요청 등록 (출발지·목적지·시간)
- 픽업 제공자 등록 및 인증 (서류 업로드 + 관리자 승인)
- 요청자 리스트 제공 (제공자 초대용)
  - 노출 정보: 시간대, 대략 위치(동/구), 목적지 유형
  - 정확한 주소/좌표는 **초대 수락 후** 공개
- 픽업 상태 관리
  `(REQUESTED → MATCHED → IN_PROGRESS → ARRIVED → COMPLETED / CANCELLED)`
- 사진 인증, 푸시 알림, 평가

----

### Real-time Sync Rules (MVP v1.0 확장 요구사항)

리스트 화면 및 초대/요청/Trip 상태는 다음 규칙에 따라 실시간으로 동기화된다.  
리스트 화면은 **클라이언트 컴포넌트**로 유지하며, 각 이벤트는 Supabase Realtime 기반으로 처리한다.

#### 1) 실시간 동기화 대상 화면
- 요청자: “내 요청 목록”, “요청 상세 데이터 패널(상단 요약)”  
- 제공자: “초대 보낸 목록”, “요청자 리스트(초대 가능 목록)”, “제공 상세 데이터 패널(상단 요약)”  
- 공통: 초대 수신/수락/거절 상태, Trip 매칭 결과, Trip 인원수 변화

#### 2) 실시간 데이터 소스 (Supabase Realtime 대상 테이블)
- **invitations**
  - INSERT: 새로운 초대 생성 → 요청자 화면에 즉시 표시
  - UPDATE: `PENDING → ACCEPTED` 즉시 반영
  - UPDATE: `PENDING → REJECTED` 즉시 반영
  - UPDATE: 초대가 Trip capacity/LOCK에 의해 `EXPIRED`로 변경되면 즉시 반영

- **pickup_requests**
  - INSERT: 요청자가 새로운 요청을 생성하면 제공자의 요청 리스트에 실시간 반영
  - UPDATE: `progress_stage` 변화 시 상단 요약 패널 즉시 갱신  
    (`REQUESTED → MATCHED → IN_PROGRESS → ARRIVED → COMPLETED / CANCELLED`)

- **trips**
  - UPDATE: Trip 인원수 변화 (`accepted_count`) 즉시 반영
  - UPDATE: 제공자가 출발 버튼 클릭 → `IN_PROGRESS` 즉시 반영
  - UPDATE: 도착/사진 업로드 시 `ARRIVED` 실시간 반영

#### 3) 실시간 이벤트 매핑 규칙
아래 매핑 테이블에 따라 클라이언트는 해당 이벤트를 수신하면 즉시 UI를 업데이트한다.

| Table | Event | 조건(filter) | 반영되는 화면 | 설명 |
|-------|--------|----------------|-----------------------|------|
| invitations | INSERT | requester_id=me | 요청자: 초대 수신 알림 | 새 초대 도착 즉시 표시 |
| invitations | INSERT | provider_id=me | 제공자: 초대 보낸 목록 | 초대가 보낸 즉시 UI 반영 |
| invitations | UPDATE | status=ACCEPTED | 제공자/요청자 모두 | “대기중 → 수락됨” 즉시 변화 |
| invitations | UPDATE | status=REJECTED | 제공자 | “대기중 → 거절됨” 반영 |
| pickup_requests | INSERT | N/A | 제공자 요청 리스트 | 새로운 요청 등록 즉시 반영 |
| pickup_requests | UPDATE | progress_stage 변경 | 요청자/제공자 | 상태 타임라인 즉시 갱신 |
| trips | UPDATE | accepted_count 변경 | 제공자/요청자 | 인원 수 변화를 실시간 표시 |
| trips | UPDATE | status 변경 | 모두 | 출발/도착/완료 등 즉시 반영 |

#### 4) Realtime 기술 요구사항
- 클라이언트는 channel 당 1개의 subscribe만 유지한다. (중복 subscribe 금지)
- room/channel 네이밍 규칙:  
  - `messages:room-{invite_id}`  
  - `invitation:user-{user_id}`  
  - `requests:group-{school_id}`  
- subscribe/unsubscribe는 컴포넌트 mount/unmount 생명주기에 맞춘다.
- Mutation 발생 시 UI는 optimistic update 하지 않고, **서버 반영 후 Realtime 이벤트로 UI를 갱신**한다.

#### 5) 예외 및 비기능 요구사항
- Trip이 LOCK(IN_PROGRESS) 되면 초대 관련 실시간 흐름도 즉시 차단된다.
- 네트워크 느림/일시 중단 시 Realtime channel 자동 재연결 허용.
- 중복 이벤트 수신 방지를 위해 payload 기반 de-duplication 필요.




※ `MATCHED`는 **요청자가 제공자의 초대를 수락하여 Trip에 포함된 상태**를 의미한다.

---

## 3. 사용자 플로우 (단방향 초대 고정)

### 요청자
픽업 요청 등록  
→ 제공자의 초대 대기  
→ 초대 수신  
→ 초대 수락 또는 거절  
→ 픽업 진행  
→ 도착 사진 확인  
→ 평가 전송

### 제공자
인증 완료  
→ 요청자 리스트 확인  
→ 픽업 초대 전송  
→ 수락 대기  
→ (수락 시) 매칭 인원 +1  
→ 최대 3명까지 반복  
→ 출발 버튼 클릭  
→ IN_PROGRESS (Trip LOCK)  
→ 도착 후 사진 업로드 → ARRIVED

---

## 4. 핵심 엔지니어링 규칙 (절대 기준)

### 상태(enum) 규칙

- 상태(enum)는 **Trip 단위 상태만** 표현한다
- 초대 상태는 enum이 아닌 **Invitation 데이터**로 관리한다
- Invitation 상태:
  `PENDING / ACCEPTED / REJECTED / EXPIRED`

상태 전이:
- REQUESTED: 픽업 요청 생성됨
- MATCHED: 초대 ACCEPTED → Trip에 포함
- IN_PROGRESS: 제공자가 출발 버튼 클릭 (LOCK)
- ARRIVED: 도착 사진 업로드 완료
- COMPLETED: 평가 제출 완료 또는 자동 완료
- CANCELLED: 취소 또는 노쇼

---

### Invitation 규칙 (서버/DB 강제)

- **요청자(부모님)**: 여러 제공자로부터 **동시에 여러 PENDING 초대를 받을 수 있음**
  - 목적: 요청자가 여러 제공자의 프로필을 비교하고 선택할 수 있는 권한 보장
  - 제한 없음: 동시에 받을 수 있는 PENDING 초대 개수에 제한 없음
  - 단, 동일한 제공자가 동일한 요청에 중복 초대를 보내는 것은 차단
- **제공자(이모님)**: 동시에 **최대 3개의 PENDING 초대만** 보낼 수 있음
  - 목적: 무분별한 초대 남발 방지 및 책임감 있는 매칭 유도
  - 초대가 수락(ACCEPTED) 또는 거절(REJECTED)되면 다시 새로운 초대 전송 가능
  - Trip의 수락된 인원이 3명 미만일 때만 초대 가능 (Trip capacity 검증)
- 초대는 유효시간(24시간) 경과 시 자동 `EXPIRED`
- 초대 관련 제한은 **프론트가 아닌 서버/DB에서 강제**
- **DB 제약**: `idx_invitations_unique_pending_requester` 인덱스는 제거됨 (2026-01-19)

---

### Trip 규칙 (픽업 세션)

- 픽업은 제공자의 **1회 출발 단위 = Trip**
- Trip은 `capacity = 3`
- 초대 ACCEPT 시점에 서버/DB에서 capacity 초과를 차단한다

---

### Trip LOCK 규칙

- 출발 버튼 클릭 시 Trip은 LOCK 상태가 된다
- LOCK 이후:
  - 추가 초대 불가
  - 초대 수락 불가
  - 남아있는 모든 `PENDING` 초대는 즉시 `EXPIRED` 처리

---

### 평가 / 완료 규칙

- 사진 업로드 → ARRIVED
- 평가 제출 → COMPLETED
- ARRIVED 후 **24시간 내 평가 없으면 자동 COMPLETED**

---

### 취소 / 노쇼 규칙

- 취소와 노쇼는 모두 `CANCELLED` 상태로 처리
- 단, `reason_code`로 구분:
  - CANCEL
  - NO_SHOW
- MVP에서는 패널티 없음 (기록만 유지)

---

## 5. Decision / Risk

- 아동 안전 사고: 인증 + 사진 + 기록으로 대응
- 허위 학부모: 서류 + 관리자 승인
- 노쇼: 기록만 남기고 패널티 없음
- 광고: 픽업 기능과 완전히 분리

---

## 6. Dependencies

### 외부 서비스
- 지도 API (좌표 검색/저장)
- 푸시 알림
- 결제 시스템 (v2)

### 데이터 정책
- 인증 서류: 승인 후 30일 보관 후 삭제
- 인증 서류 접근: 관리자만 가능

---

## 7. Success Criteria

### 핵심 지표
- 월 매칭 성공 건수: 3개월 내 100건
- 요청자 재사용률: 40% 이상
- 평균 평점: 4.5 이상

---

## 8. Definition of Done

### 필수
- 상태/초대/LOCK/capacity 서버 강제
- 초대 중복/과매칭 불가
- 픽업 기록 누락 없음
- 모바일 웹 UX 정상

### 출시 가능
- UI 고도화
- 자동 매칭

### 출시 불가
- 인증 우회
- 상태 전이 누락

---

## 9. Nope (MVP 제외)

- 요청자 → 제공자 요청
- 즉시 호출형 픽업
- 외부인 참여
- 패널티/벌점
- 광고 등록 기능

---

## 10. Post-Launch Plan

### v1.1
- 마이페이지 이력
- 관리자 승인 개선

### v2
- 결제
- 중·고등학교 확장
- 실시간 위치 공유
- 광고 페이지

### v3+
- 학원 기반 픽업
- 지역 기반 등·하교
- 지자체 협력

---

## Change Log
- 2025-01-XX: Cursor 개발 기준 PRD 확정
- 2025-01-XX: 초대/Trip/LOCK/capacity 충돌 제거
- 2025-01-XX: 노쇼/취소/평가 규칙 고정
- 2026-01-19: Invitation 규칙 변경 - 요청자 여러 초대 수신 가능, 제공자 최대 3개 PENDING 초대 제한