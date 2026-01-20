# Lead 이벤트 선택적 전화번호 전송 가이드

## 📋 개요

사전 신청 폼에서 **전화번호가 선택사항**일 때 메타 픽셀 Lead 이벤트를 안전하게 전송하는 방법입니다.

## ✅ 구현 완료 항목

### 1. **조건부 전화번호 전송**
- ✅ 전화번호가 있으면: SHA-256 해싱 후 전송
- ✅ 전화번호가 없으면: 이메일만 해싱하여 전송
- ✅ 에러 없이 안전하게 처리

### 2. **이메일 우선 전송**
- ✅ 이메일은 항상 SHA-256 해싱 후 전송
- ✅ 전화번호 없어도 매칭률 유지

### 3. **안전성 보장**
- ✅ 빈 값 체크 및 예외 처리
- ✅ 모든 개인정보 SHA-256 암호화
- ✅ 평문 데이터 절대 전송 안 함

## 🚀 사용 방법

### 1️⃣ **기본 사용법**

```typescript
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';

function PreRegistrationForm() {
  const { trackLead } = useMetaPixelTracking();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 전화번호가 있으면 함께 전송, 없으면 이메일만 전송
    await trackLead(
      email,
      phone || undefined, // 빈 문자열이면 undefined로 변환
      {
        source: 'pre_registration_form',
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        // 선택사항 - required 없음
      />
      <button type="submit">사전 신청</button>
    </form>
  );
}
```

### 2️⃣ **이메일만 있는 경우**

```typescript
// 전화번호 없이 이메일만 전송
await trackLead('user@example.com');

// 메타로 전송되는 데이터:
// {
//   em: "b4c9a289..." (SHA-256 해시값)
// }
```

### 3️⃣ **이메일 + 전화번호 모두 있는 경우**

```typescript
// 이메일과 전화번호 모두 전송
await trackLead('user@example.com', '010-1234-5678');

// 메타로 전송되는 데이터:
// {
//   em: "b4c9a289..." (SHA-256 해시값),
//   ph: "8d969eef..." (SHA-256 해시값)
// }
```

### 4️⃣ **추가 데이터와 함께 전송**

```typescript
await trackLead(
  'user@example.com',
  '010-1234-5678',
  {
    source: 'landing_page',
    campaign: 'summer_2026',
    value: 100,
  }
);
```

## 🔐 보안 처리

### SHA-256 해싱 프로세스

```
입력 데이터
    ↓
정규화 (소문자 변환, 공백 제거)
    ↓
SHA-256 해싱
    ↓
64자리 16진수 해시값
    ↓
메타로 전송
```

### 예시

```typescript
// 입력
email: "User@Example.com"
phone: "010-1234-5678"

// 정규화
email: "user@example.com"
phone: "01012345678"

// SHA-256 해싱
em: "b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514"
ph: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"

// 메타로 전송
fbq('track', 'Lead', {
  em: "b4c9a289...",
  ph: "8d969eef..."
});
```

## 🧪 테스트 방법

### 1. **테스트 페이지 접속**

```
http://localhost:3000/meta-pixel-test
```

### 2. **Lead 이벤트 테스트**

테스트 페이지에서 다음 버튼들을 사용할 수 있습니다:

- **Lead 이벤트 전송 (이메일 + 전화번호)**: 두 데이터 모두 전송
- **Lead 이벤트 전송 (이메일만)**: 이메일만 전송 (전화번호 없음)

### 3. **실제 폼 예시**

```
http://localhost:3000/pre-registration-example
```

실제 사전 신청 폼을 테스트할 수 있습니다.

## 📊 전송 데이터 비교

| 상황 | 이메일 | 전화번호 | 전송 데이터 |
|------|--------|----------|------------|
| 둘 다 입력 | ✅ | ✅ | `{ em, ph }` |
| 이메일만 입력 | ✅ | ❌ | `{ em }` |
| 이메일 없음 | ❌ | ✅ | 이벤트만 전송 (매칭 데이터 없음) |

## ⚠️ 주의사항

### 1. **이메일 필수 권장**

```typescript
// ❌ 나쁜 예: 이메일 없이 전화번호만
await trackLead('', '010-1234-5678');

// ✅ 좋은 예: 이메일 필수, 전화번호 선택
await trackLead('user@example.com', phone || undefined);
```

### 2. **빈 문자열 처리**

```typescript
// ❌ 나쁜 예: 빈 문자열 그대로 전달
await trackLead(email, phone); // phone이 ''일 수 있음

// ✅ 좋은 예: undefined로 변환
await trackLead(email, phone || undefined);
```

### 3. **에러 처리**

```typescript
try {
  await trackLead(email, phone);
  console.log('Lead 이벤트 전송 완료');
} catch (error) {
  console.error('Lead 이벤트 전송 실패:', error);
  // 에러가 발생해도 기본 Lead 이벤트는 전송됨
}
```

## 🎯 실제 적용 예시

### 사전 신청 폼

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

    // 이메일 검증
    if (!email) {
      alert('이메일을 입력해주세요.');
      return;
    }

    // Lead 이벤트 전송
    await trackLead(
      email,
      phone || undefined,
      {
        source: 'pre_registration_form',
        timestamp: new Date().toISOString(),
      }
    );

    // 성공 처리
    alert('사전 신청이 완료되었습니다!');
    setEmail('');
    setPhone('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          이메일 <span>*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label>
          전화번호 <span>(선택사항)</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <button type="submit">사전 신청하기</button>

      <p>
        🔒 모든 개인정보는 SHA-256 암호화되어 안전하게 전송됩니다.
      </p>
    </form>
  );
}
```

## 📈 매칭률 향상 팁

### 1. **이메일 우선 수집**
- 전화번호가 없어도 이메일만으로 매칭 가능
- 이메일 매칭률이 전화번호보다 높음

### 2. **선택적 전화번호 수집**
- "더 정확한 맞춤 정보를 위해 전화번호를 입력해주세요" 안내
- 입력하면 매칭률 향상

### 3. **추가 정보 활용**
```typescript
await trackLead(email, phone, {
  fn: firstName,  // 이름 (선택)
  ln: lastName,   // 성 (선택)
  ct: city,       // 도시 (선택)
});
```

## 🔗 관련 파일

- `lib/meta-pixel.ts` - trackLead 함수 구현
- `hooks/use-meta-pixel-tracking.ts` - React 훅
- `app/(routes)/pre-registration-example/page.tsx` - 실제 폼 예시
- `app/(routes)/meta-pixel-test/page.tsx` - 테스트 페이지

## ✅ 체크리스트

- [x] trackLead 함수 구현
- [x] 선택적 전화번호 처리
- [x] SHA-256 해싱 적용
- [x] 에러 처리 및 예외 상황 대응
- [x] React 훅 제공
- [x] 테스트 페이지 추가
- [x] 실제 폼 예시 제공
- [x] 문서 작성

---

**작성일**: 2026-01-19  
**버전**: 1.0.0
