# Database Schema Documentation

## Invitations Table

### 초대 규칙 (2026-01-19 업데이트)

#### 요청자 (Requester)
- **여러 PENDING 초대 수신 가능**
- 동시에 받을 수 있는 PENDING 초대 개수에 제한 없음
- 여러 제공자의 프로필을 비교하고 선택할 수 있음

#### 제공자 (Provider)
- **최대 3개의 PENDING 초대만 전송 가능**
- 초대가 ACCEPTED 또는 REJECTED되면 다시 새로운 초대 전송 가능
- 동일한 요청에 중복 초대 불가

### 인덱스

#### 제거된 인덱스 (2026-01-19)
- `idx_invitations_unique_pending_requester` - **제거됨**
  - 이유: 요청자가 여러 PENDING 초대를 받을 수 있도록 변경

#### 현재 인덱스
- `invitations_pkey` - Primary Key
- `idx_invitations_trip` - Trip ID 인덱스
- `idx_invitations_request` - Request ID 인덱스
- `idx_invitations_requester` - Requester Profile ID 인덱스
- `idx_invitations_status` - Status 인덱스
- `idx_invitations_expires` - Expires At 인덱스

### 서버 검증 로직

#### actions/invitations.ts
- **라인 346-369**: 요청자 PENDING 초대 제한 제거
  - 동일한 제공자가 동일한 요청에 중복 초대를 보내는 것만 차단
- **라인 371-394**: 제공자 PENDING 초대 3개 제한
  - 현재 PENDING 초대 개수 확인
  - 3개 이상이면 에러 반환

### 마이그레이션

```sql
-- 파일: supabase/migrations/20260119141500_drop_unique_pending_requester_index.sql
DROP INDEX IF EXISTS idx_invitations_unique_pending_requester;
```

### 주의사항

⚠️ **중요**: 이 규칙은 PRD Section 4 "Invitation 규칙"에 명시되어 있습니다.
- DB 제약과 서버 로직이 일치해야 합니다
- 프론트엔드가 아닌 **서버/DB에서 강제**합니다
- 향후 DB 마이그레이션 시 이 규칙을 준수해야 합니다
