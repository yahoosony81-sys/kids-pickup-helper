# Phase 8 수정 사항 충돌 위험 분석

## 📋 개요

Phase 8 수정 사항(서비스 완료와 리뷰 분리)이 이미 개발된 코드와 충돌하는 부분을 분석한 문서입니다.

---

## 🔴 주요 충돌 지점

### 1. `actions/trip-arrivals.ts` - 상태 업데이트 로직

**현재 구현:**
- 223줄: `pickup_requests.status = 'ARRIVED'` 업데이트
- 264줄: `trips.status = 'ARRIVED'` 업데이트
- 115줄: Trip 상태 확인에서 `status = 'IN_PROGRESS'` 또는 `'ARRIVED'` 허용

**수정 필요:**
- `ARRIVED` → `COMPLETED`로 변경
- Trip 상태 확인 로직도 수정 필요 (115줄)
  - 현재: `status !== "IN_PROGRESS" && status !== "ARRIVED"` 체크
  - 수정: `status !== "IN_PROGRESS" && status !== "COMPLETED"` 체크
  - **주의**: 도착 사진 업로드는 `IN_PROGRESS` 상태에서만 가능해야 함
  - `COMPLETED` 상태에서는 업로드 불가능하도록 유지 (이미 완료된 Trip)

**충돌 위험도**: 🔴 높음 (핵심 로직 변경)

---

### 2. UI 컴포넌트 - ARRIVED 상태 체크

#### 2.1 `app/(routes)/trips/[tripId]/page.tsx`

**현재 구현:**
- 255줄, 264줄: `pickupRequest.status === "ARRIVED"` 체크
- 384줄: `trip.status === "ARRIVED"` 체크

**수정 필요:**
- 모든 `ARRIVED` 체크를 `COMPLETED`로 변경

**충돌 위험도**: 🟡 중간 (UI 표시만 영향)

#### 2.2 `app/(routes)/invitations/[invitationId]/page.tsx`

**현재 구현:**
- 300줄: `trip?.status === "ARRIVED"` 체크

**수정 필요:**
- `ARRIVED` 체크를 `COMPLETED`로 변경

**충돌 위험도**: 🟡 중간 (UI 표시만 영향)

#### 2.3 상태 배지 설정 (statusConfig)

**현재 구현:**
- `app/(routes)/trips/[tripId]/page.tsx` 53줄: ARRIVED 배지 정의
- `app/(routes)/trips/page.tsx` 57줄: ARRIVED 배지 정의
- `app/(routes)/pickup-requests/page.tsx` 57줄: ARRIVED 배지 정의

**수정 필요:**
- **유지 가능**: statusConfig의 ARRIVED 정의는 UI 표시용이므로 유지 가능
- 기존 데이터(ARRIVED 상태)를 표시하기 위해 필요
- 하지만 새로운 데이터는 COMPLETED 상태로 생성되므로, ARRIVED 배지는 점진적으로 사용되지 않을 수 있음

**충돌 위험도**: 🟢 낮음 (기존 데이터 호환성 유지)

---

### 3. PRD 문서와의 충돌

**PRD Section 4 상태 전이 규칙:**
```
- ARRIVED: 도착 사진 업로드 완료
- COMPLETED: 평가 제출 완료 또는 자동 완료
```

**Phase 8 원칙:**
```
- 도착 인증 시점에 즉시 COMPLETED 상태로 전환
- 리뷰는 별도 플로우 (서비스 완료와 무관)
```

**충돌 내용:**
- PRD는 ARRIVED → COMPLETED 2단계 전이를 정의
- Phase 8은 ARRIVED를 건너뛰고 바로 COMPLETED로 전환

**해결 방안:**
1. PRD를 업데이트하여 새로운 원칙 반영
2. 또는 원칙에 맞게 구현 후 PRD와의 불일치를 문서화

**충돌 위험도**: 🟡 중간 (문서 불일치)

---

### 4. DB 스키마와의 충돌

**현재 DB 스키마:**
- `request_status` enum에 `ARRIVED` 포함
- `trip_status` enum에 `ARRIVED` 포함

**충돌 내용:**
- DB 스키마에는 ARRIVED enum이 정의되어 있음
- 하지만 로직상 ARRIVED 상태를 사용하지 않고 바로 COMPLETED로 전환

**해결 방안:**
- **DB 스키마 수정 금지 원칙**에 따라 enum은 그대로 유지
- 로직상 ARRIVED 상태를 사용하지 않도록 구현
- 기존 데이터가 ARRIVED 상태일 수 있으므로, UI에서는 ARRIVED 배지 유지 (호환성)

**충돌 위험도**: 🟢 낮음 (enum은 유지, 로직만 변경)

---

## ✅ 수정 체크리스트

### 필수 수정 사항

- [ ] `actions/trip-arrivals.ts` 223줄: `status: "ARRIVED"` → `status: "COMPLETED"`
- [ ] `actions/trip-arrivals.ts` 264줄: `status: "ARRIVED"` → `status: "COMPLETED"`
- [ ] `actions/trip-arrivals.ts` 115줄: Trip 상태 확인 로직 수정
  - `status !== "IN_PROGRESS" && status !== "ARRIVED"` → `status !== "IN_PROGRESS" && status !== "COMPLETED"`
- [ ] `app/(routes)/trips/[tripId]/page.tsx` 255줄, 264줄: `pickupRequest.status === "ARRIVED"` → `pickupRequest.status === "COMPLETED"`
- [ ] `app/(routes)/trips/[tripId]/page.tsx` 384줄: `trip.status === "ARRIVED"` → `trip.status === "COMPLETED"`
- [ ] `app/(routes)/invitations/[invitationId]/page.tsx` 300줄: `trip?.status === "ARRIVED"` → `trip?.status === "COMPLETED"`

### 선택 사항 (호환성 유지)

- [ ] statusConfig의 ARRIVED 배지 정의 유지 (기존 데이터 표시용)
- [ ] PRD 문서 업데이트 또는 불일치 문서화

---

## 🎯 테스트 시나리오

### 1. 도착 사진 업로드 테스트
- 제공자가 도착 사진 업로드
- `pickup_requests.status`가 `COMPLETED`로 변경되는지 확인
- 모든 참여자 도착 시 `trips.status`가 `COMPLETED`로 변경되는지 확인

### 2. UI 표시 테스트
- Trip 상세 페이지에서 `COMPLETED` 상태가 올바르게 표시되는지 확인
- 초대 상세 페이지에서 `COMPLETED` 상태가 올바르게 표시되는지 확인
- 기존 ARRIVED 상태 데이터도 올바르게 표시되는지 확인 (호환성)

### 3. 상태 전이 테스트
- `IN_PROGRESS` 상태에서 도착 사진 업로드 가능한지 확인
- `COMPLETED` 상태에서 도착 사진 업로드 불가능한지 확인
- 제공자가 `COMPLETED` 상태에서 즉시 다음 Trip 생성 가능한지 확인

---

## 📝 참고 사항

1. **기존 데이터 호환성**: 기존에 ARRIVED 상태로 저장된 데이터가 있을 수 있으므로, UI에서는 ARRIVED 배지를 유지하는 것이 좋습니다.

2. **PRD 업데이트**: PRD Section 4의 상태 전이 규칙을 업데이트하거나, Phase 8 원칙과의 불일치를 명시적으로 문서화해야 합니다.

3. **DB 스키마**: ARRIVED enum은 그대로 유지하되, 로직상 사용하지 않도록 구현합니다.

4. **점진적 전환**: 기존 데이터는 ARRIVED 상태로 유지하고, 새로운 데이터만 COMPLETED 상태로 생성하는 방식으로 점진적 전환이 가능합니다.

