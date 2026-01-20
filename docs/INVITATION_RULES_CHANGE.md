# 초대 규칙 변경 사항 (2026-01-19)

## 📋 변경 요약

### 이전 규칙
- ❌ 요청자는 동시에 **PENDING 초대 1개만** 받을 수 있음
- ✅ 제공자는 수락된 인원이 3명 미만일 때만 초대 가능

### 새로운 규칙
- ✅ 요청자는 **여러 제공자로부터 동시에 여러 PENDING 초대**를 받을 수 있음
- ✅ 제공자는 **동시에 최대 3개의 PENDING 초대만** 보낼 수 있음
- ✅ 제공자는 수락된 인원이 3명 미만일 때만 초대 가능 (Trip capacity 검증)

## 🎯 변경 이유

### 비즈니스 요구사항
- 요청자(부모님)가 여러 제공자의 프로필을 비교하고 선택할 수 있어야 함
- 제공자(이모님)의 무분별한 초대 남발 방지 필요

### 사용자 경험 개선
- 요청자: 선택권 보장, 더 나은 매칭 가능
- 제공자: 책임감 있는 매칭 유도

## 🛠️ 구현 내용

### 1. 데이터베이스 변경
- **제거된 인덱스**: `idx_invitations_unique_pending_requester`
- **마이그레이션 파일**: `supabase/migrations/20260119141500_drop_unique_pending_requester_index.sql`

```sql
DROP INDEX IF EXISTS idx_invitations_unique_pending_requester;
```

### 2. 서버 로직 변경 (`actions/invitations.ts`)

#### 요청자 제한 제거 (라인 346-369)
```typescript
// 동일한 제공자가 동일한 요청에 중복 초대를 보내는 것만 차단
const { data: duplicateCheck } = await supabase
  .from("invitations")
  .select("id")
  .eq("pickup_request_id", pickupRequestId)
  .eq("provider_profile_id", providerProfile.id)
  .eq("status", "PENDING")
  .maybeSingle();
```

#### 제공자 3개 제한 추가 (라인 371-394)
```typescript
// 제공자의 현재 PENDING 초대 개수 확인
const { count: providerPendingCount } = await supabase
  .from("invitations")
  .select("id", { count: "exact", head: true })
  .eq("provider_profile_id", providerProfile.id)
  .eq("status", "PENDING");

if ((providerPendingCount || 0) >= 3) {
  return {
    success: false,
    error: "동시에 보낼 수 있는 초대(대기 중)는 최대 3개입니다."
  };
}
```

### 3. 문서 업데이트
- ✅ `docs/PRD.md` - Section 4 "Invitation 규칙" 업데이트
- ✅ `docs/DATABASE_SCHEMA.md` - 새로 생성
- ✅ `actions/invitations.ts` - 파일 헤더 주석 업데이트
- ✅ `docs/INVITATION_RULES_CHANGE.md` - 이 파일

## 🧪 테스트 시나리오

### 시나리오 1: 요청자가 여러 초대 받기 ✅
1. 부모님 A가 픽업 요청 생성
2. 이모님 B가 부모님 A에게 초대 전송 → ✅ 성공
3. 이모님 C가 부모님 A에게 초대 전송 → ✅ 성공
4. 부모님 A는 2개의 PENDING 초대를 받고 선택 가능

### 시나리오 2: 제공자 3개 제한 ✅
1. 이모님 D가 부모님 E에게 초대 전송 → ✅ 성공 (1/3)
2. 이모님 D가 부모님 F에게 초대 전송 → ✅ 성공 (2/3)
3. 이모님 D가 부모님 G에게 초대 전송 → ✅ 성공 (3/3)
4. 이모님 D가 부모님 H에게 초대 전송 → ❌ 실패 (한도 초과)
5. 부모님 E가 초대 수락 → PENDING 2개로 감소
6. 이모님 D가 부모님 H에게 다시 초대 전송 → ✅ 성공 (3/3)

## 📚 참고 문서

- **PRD**: `docs/PRD.md` - Section 4 "Invitation 규칙"
- **데이터베이스 스키마**: `docs/DATABASE_SCHEMA.md`
- **서버 로직**: `actions/invitations.ts` (라인 346-394)
- **마이그레이션**: `supabase/migrations/20260119141500_drop_unique_pending_requester_index.sql`

## ⚠️ 주의사항

### 향후 개발 시 유의사항
1. **DB 제약과 서버 로직 일치**: 데이터베이스 제약과 서버 검증 로직이 항상 일치해야 합니다
2. **서버에서 강제**: 프론트엔드가 아닌 서버/DB에서 규칙을 강제합니다
3. **PRD 우선**: 구현이 헷갈릴 경우 PRD Section 4를 최우선으로 따릅니다
4. **마이그레이션 주의**: 향후 DB 마이그레이션 시 이 규칙을 준수해야 합니다

### 절대 하지 말아야 할 것
- ❌ `idx_invitations_unique_pending_requester` 인덱스를 다시 생성하지 마세요
- ❌ 요청자에게 PENDING 초대 개수 제한을 추가하지 마세요
- ❌ 제공자의 3개 제한을 제거하지 마세요

## 📝 Change Log

- **2026-01-19**: 초대 규칙 변경
  - 요청자: 여러 PENDING 초대 수신 가능
  - 제공자: 최대 3개 PENDING 초대 제한
  - DB 인덱스 제거: `idx_invitations_unique_pending_requester`
  - 문서 업데이트: PRD, DATABASE_SCHEMA, actions/invitations.ts
