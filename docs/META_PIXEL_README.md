# 메타 픽셀 수동 고급 매칭 - 빠른 시작 가이드

## ⚡ 빠른 설정 (3단계)

### 1️⃣ 픽셀 ID 설정

`.env.local` 파일에 메타 픽셀 ID 추가:

```bash
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id_here
```

### 2️⃣ 개발 서버 재시작

```bash
pnpm dev
```

### 3️⃣ 테스트

브라우저에서 접속:
```
http://localhost:3000/meta-pixel-test
```

## ✅ 구현 완료 항목

- ✅ **SHA-256 해싱**: 이메일/전화번호 안전하게 암호화
- ✅ **수동 고급 매칭**: `fbq('init', pixelId, { em, ph })` 자동 적용
- ✅ **자동 이벤트 추적**:
  - PageView (모든 페이지)
  - CompleteRegistration (회원가입 완료)
- ✅ **Clerk 통합**: 사용자 정보 자동 추출 및 해싱
- ✅ **보안**: 평문 데이터 절대 전송 안 함

## 📂 생성된 파일

```
lib/meta-pixel.ts                    # SHA-256 해싱 + 픽셀 유틸리티
components/meta-pixel.tsx            # 픽셀 스크립트 로더
components/registration-tracker.tsx  # 회원가입 추적
hooks/use-meta-pixel-tracking.ts     # 추적 훅
app/layout.tsx                       # ✏️ 수정됨 (픽셀 추가)
app/(routes)/meta-pixel-test/page.tsx # 테스트 페이지
docs/META_PIXEL_GUIDE.md             # 상세 가이드
.env.meta-pixel.example              # 환경 변수 예시
```

## 🎯 주요 기능

### 자동 추적

1. **PageView**: 모든 페이지 방문 시 자동
2. **CompleteRegistration**: 신규 가입 시 자동 (5분 이내 계정)

### 수동 추적

```typescript
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';

function MyComponent() {
  const { trackCustom } = useMetaPixelTracking();

  const handleEvent = () => {
    trackCustom('MyEvent', { key: 'value' });
  };
}
```

## 🔐 보안

- ✅ 이메일/전화번호 → SHA-256 해싱
- ✅ 평문 데이터 절대 전송 안 함
- ✅ 클라이언트 측 암호화
- ✅ 메타 보안 지침 준수

## 🧪 테스트 방법

### 1. Meta Pixel Helper (권장)

1. [Chrome 확장 프로그램](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) 설치
2. `/meta-pixel-test` 페이지 접속
3. 이벤트 전송 버튼 클릭
4. Pixel Helper 아이콘 클릭하여 확인

### 2. Events Manager

1. [Meta Events Manager](https://business.facebook.com/events_manager2) 접속
2. 픽셀 선택
3. **테스트 이벤트** 탭에서 실시간 확인

## 📖 상세 문서

전체 가이드는 [`docs/META_PIXEL_GUIDE.md`](./META_PIXEL_GUIDE.md) 참조

## 🆘 문제 해결

### 픽셀이 로드되지 않음
→ `.env.local`에 `NEXT_PUBLIC_META_PIXEL_ID` 설정 확인
→ 개발 서버 재시작

### 이벤트가 전송되지 않음
→ 브라우저 콘솔에서 에러 확인
→ Meta Pixel Helper로 픽셀 로드 확인

### 고급 매칭 데이터가 없음
→ 사용자 로그인 확인
→ Clerk에서 이메일/전화번호 설정 확인

---

**작성일**: 2026-01-19  
**버전**: 1.0.0
