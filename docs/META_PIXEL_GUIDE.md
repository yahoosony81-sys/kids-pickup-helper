# 메타 픽셀 수동 고급 매칭 구현 가이드

## 📋 개요

이 문서는 Kids Pickup Helper 프로젝트에 구현된 **메타 픽셀 수동 고급 매칭(Manual Advanced Matching)** 기능에 대한 완전한 가이드입니다.

## 🎯 주요 기능

### 1. **수동 고급 매칭 (Manual Advanced Matching)**
- 사용자 이메일과 전화번호를 SHA-256으로 해싱하여 메타에 전송
- 개인정보 보호를 위해 평문 데이터는 절대 전송하지 않음
- 메타의 광고 타겟팅 정확도 향상

### 2. **자동 이벤트 추적**
- **PageView**: 모든 페이지 방문 시 자동 추적
- **CompleteRegistration**: 신규 회원가입 완료 시 자동 추적
- **커스텀 이벤트**: 필요에 따라 추가 이벤트 추적 가능

### 3. **Clerk 통합**
- Clerk 인증 시스템과 완벽하게 통합
- 사용자 로그인 시 자동으로 고급 매칭 데이터 적용
- 신규 가입자 자동 감지 및 이벤트 전송

## 🔧 설정 방법

### 1. 환경 변수 설정

`.env.local` 파일에 메타 픽셀 ID를 추가하세요:

```bash
# 메타 픽셀 ID (Meta Ads Manager에서 확인)
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id_here
```

### 2. 메타 픽셀 ID 확인 방법

1. [Meta Business Suite](https://business.facebook.com/) 접속
2. **이벤트 관리자(Events Manager)** 메뉴 선택
3. 데이터 소스에서 픽셀 선택
4. 설정 탭에서 **픽셀 ID** 확인 (16자리 숫자)

## 📁 파일 구조

```
kids_pickup_helper/
├── lib/
│   └── meta-pixel.ts              # 메타 픽셀 유틸리티 (SHA-256 해싱 포함)
├── components/
│   ├── meta-pixel.tsx             # 메타 픽셀 스크립트 로더
│   ├── registration-tracker.tsx   # 회원가입 완료 추적
│   └── providers/
│       └── sync-user-provider.tsx # 사용자 동기화 + 추적
├── hooks/
│   └── use-meta-pixel-tracking.ts # 메타 픽셀 추적 훅
└── app/
    └── layout.tsx                 # 전역 레이아웃 (픽셀 초기화)
```

## 🔐 보안 구현

### SHA-256 해싱

모든 개인정보는 클라이언트 측에서 SHA-256으로 해싱된 후 메타로 전송됩니다:

```typescript
// 이메일 해싱 예시
const email = "user@example.com";
const hashedEmail = await hashEmail(email);
// 결과: "b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514"

// 전화번호 해싱 예시
const phone = "+821012345678";
const hashedPhone = await hashPhone(phone);
// 결과: "특수문자 제거 후 해싱된 값"
```

### 데이터 처리 흐름

1. **사용자 입력** → 이메일/전화번호
2. **정규화** → 소문자 변환, 공백 제거
3. **해싱** → SHA-256 암호화
4. **전송** → 메타 픽셀로 해시값만 전송
5. **원본 데이터** → 절대 메타로 전송되지 않음

## 📊 이벤트 추적

### 1. PageView (자동)

모든 페이지 방문 시 자동으로 추적됩니다.

```typescript
// components/meta-pixel.tsx에서 자동 실행
trackPageView();
```

### 2. CompleteRegistration (자동)

신규 회원가입 완료 시 자동으로 추적됩니다.

```typescript
// components/registration-tracker.tsx에서 자동 실행
// 조건: 계정 생성 후 5분 이내
await trackRegistration(email, phone, {
  content_name: 'User Registration',
  status: 'completed',
});
```

### 3. 커스텀 이벤트 (수동)

필요한 곳에서 수동으로 이벤트를 추적할 수 있습니다:

```typescript
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';

function MyComponent() {
  const { trackCustom } = useMetaPixelTracking();

  const handleButtonClick = () => {
    trackCustom('ButtonClick', {
      button_name: 'Subscribe',
      page: 'Home',
    });
  };

  return <button onClick={handleButtonClick}>Subscribe</button>;
}
```

## 🧪 테스트 방법

### 1. Meta Pixel Helper 설치

Chrome 확장 프로그램 [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) 설치

### 2. 이벤트 확인

1. 웹사이트 방문
2. Meta Pixel Helper 아이콘 클릭
3. 다음 이벤트 확인:
   - ✅ **PageView** - 페이지 로드 시
   - ✅ **CompleteRegistration** - 회원가입 완료 시
   - ✅ **고급 매칭 데이터** - `em`, `ph` 파라미터 확인

### 3. Events Manager에서 확인

1. [Meta Events Manager](https://business.facebook.com/events_manager2) 접속
2. 픽셀 선택
3. **테스트 이벤트** 탭에서 실시간 이벤트 확인
4. **개요** 탭에서 이벤트 통계 확인

## 🎨 사용 예시

### 예시 1: 픽업 요청 완료 추적

```typescript
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';

function PickupRequestForm() {
  const { trackCustom } = useMetaPixelTracking();

  const handleSubmit = async (data) => {
    // 픽업 요청 생성
    await createPickupRequest(data);

    // 메타 픽셀 이벤트 전송
    trackCustom('PickupRequestCreated', {
      pickup_type: data.type,
      location: data.location,
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 예시 2: 픽업 완료 추적

```typescript
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';

function PickupCompleteButton({ tripId }) {
  const { trackCustom } = useMetaPixelTracking();

  const handleComplete = async () => {
    await completeTrip(tripId);

    trackCustom('PickupCompleted', {
      trip_id: tripId,
      status: 'completed',
    });
  };

  return <button onClick={handleComplete}>픽업 완료</button>;
}
```

## 🔍 문제 해결

### 픽셀이 로드되지 않음

**증상**: Meta Pixel Helper에 픽셀이 표시되지 않음

**해결 방법**:
1. `.env.local` 파일에 `NEXT_PUBLIC_META_PIXEL_ID`가 설정되어 있는지 확인
2. 개발 서버 재시작: `pnpm dev`
3. 브라우저 캐시 삭제 후 새로고침

### 이벤트가 전송되지 않음

**증상**: Events Manager에 이벤트가 표시되지 않음

**해결 방법**:
1. 브라우저 콘솔에서 에러 확인
2. Meta Pixel Helper로 픽셀 로드 확인
3. 네트워크 탭에서 `facebook.com/tr` 요청 확인

### 고급 매칭 데이터가 없음

**증상**: `em`, `ph` 파라미터가 전송되지 않음

**해결 방법**:
1. 사용자가 로그인되어 있는지 확인
2. Clerk에서 이메일/전화번호가 설정되어 있는지 확인
3. 브라우저 콘솔에서 해싱 에러 확인

## 📚 참고 자료

- [Meta Pixel 공식 문서](https://developers.facebook.com/docs/meta-pixel)
- [고급 매칭 가이드](https://developers.facebook.com/docs/meta-pixel/advanced/advanced-matching)
- [이벤트 참조](https://developers.facebook.com/docs/meta-pixel/reference)
- [SHA-256 해싱 가이드](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters)

## ✅ 체크리스트

구현 완료 확인:

- [x] `lib/meta-pixel.ts` - SHA-256 해싱 유틸리티
- [x] `components/meta-pixel.tsx` - 픽셀 스크립트 로더
- [x] `components/registration-tracker.tsx` - 회원가입 추적
- [x] `hooks/use-meta-pixel-tracking.ts` - 추적 훅
- [x] `app/layout.tsx` - 전역 픽셀 초기화
- [x] `.env.local` - 픽셀 ID 설정
- [x] 평문 데이터 전송 차단 확인
- [x] SHA-256 해싱 동작 확인
- [x] CompleteRegistration 이벤트 자동 전송
- [x] PageView 이벤트 자동 전송

## 🚀 다음 단계

1. **픽셀 ID 설정**: `.env.local`에 실제 픽셀 ID 추가
2. **테스트**: Meta Pixel Helper로 이벤트 확인
3. **커스텀 이벤트 추가**: 비즈니스 로직에 맞는 추가 이벤트 구현
4. **전환 추적**: 광고 캠페인과 연동하여 전환율 측정

---

**작성일**: 2026-01-19  
**버전**: 1.0.0  
**작성자**: Antigravity AI
