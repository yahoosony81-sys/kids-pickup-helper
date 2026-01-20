# Lead 이벤트 구현 완료 - 빠른 참조

## ✅ 구현 완료!

**Lead 이벤트**의 선택적 전화번호 전송 로직이 완벽하게 구현되었습니다.

## 🚀 즉시 사용 가능

### 사전 신청 폼에서 사용하기

```typescript
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';

function YourForm() {
  const { trackLead } = useMetaPixelTracking();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 전화번호가 있으면 함께 전송, 없으면 이메일만 전송
    await trackLead(
      email,
      phone || undefined,
      { source: 'your_form' }
    );
  };
}
```

## 🔐 보안 보장

| 항목 | 상태 |
|------|------|
| 이메일 암호화 | ✅ SHA-256 |
| 전화번호 암호화 | ✅ SHA-256 |
| 평문 전송 | ❌ 절대 없음 |
| 빈 값 처리 | ✅ 안전하게 처리 |
| 에러 처리 | ✅ 완벽하게 처리 |

## 📊 전송 시나리오

### 1. 이메일 + 전화번호 (둘 다 입력)
```typescript
await trackLead('user@example.com', '010-1234-5678');
```
**전송 데이터**: `{ em: "해시값", ph: "해시값" }`

### 2. 이메일만 (전화번호 선택 안 함)
```typescript
await trackLead('user@example.com');
```
**전송 데이터**: `{ em: "해시값" }`

### 3. 에러 없이 안전하게 처리
- 전화번호가 빈 문자열이어도 OK
- 전화번호가 undefined여도 OK
- 이벤트는 항상 전송됨

## 🧪 테스트 방법

### 1. 테스트 페이지
```
http://localhost:3000/meta-pixel-test
```
- "Lead 이벤트 전송 (이메일 + 전화번호)" 버튼
- "Lead 이벤트 전송 (이메일만)" 버튼

### 2. 실제 폼 예시
```
http://localhost:3000/pre-registration-example
```

## 📁 생성된 파일

```
✅ lib/meta-pixel.ts (trackLead 함수 추가)
✅ hooks/use-meta-pixel-tracking.ts (trackLead 훅 추가)
✅ app/(routes)/pre-registration-example/page.tsx (실제 폼 예시)
✅ app/(routes)/meta-pixel-test/page.tsx (테스트 버튼 추가)
✅ docs/LEAD_EVENT_GUIDE.md (완전한 가이드)
✅ docs/LEAD_EVENT_QUICK_START.md (이 파일)
```

## 💡 핵심 포인트

### ✅ 이메일 필수, 전화번호 선택
```typescript
// 이메일은 항상 필요
await trackLead(email, phone || undefined);
```

### ✅ 빈 문자열 처리
```typescript
// ❌ 나쁜 예
await trackLead(email, phone); // phone이 ''일 수 있음

// ✅ 좋은 예
await trackLead(email, phone || undefined);
```

### ✅ 에러 처리 자동
```typescript
// 에러가 발생해도 기본 Lead 이벤트는 전송됨
// 별도 try-catch 불필요 (내부에서 처리됨)
```

## 🎯 실제 사용 예시

```typescript
'use client';

import { useState } from 'react';
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';

export default function PreRegistrationForm() {
  const { trackLead } = useMetaPixelTracking();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Lead 이벤트 전송
    await trackLead(email, phone || undefined, {
      source: 'pre_registration_form',
    });

    alert('사전 신청 완료!');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일 (필수)"
        required
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="전화번호 (선택)"
      />
      <button type="submit">사전 신청하기</button>
    </form>
  );
}
```

## 📚 상세 문서

더 자세한 내용은 [`LEAD_EVENT_GUIDE.md`](./LEAD_EVENT_GUIDE.md)를 참조하세요.

---

**모든 준비 완료!** 이제 사전 신청 폼에서 바로 사용하실 수 있습니다. 🚀
