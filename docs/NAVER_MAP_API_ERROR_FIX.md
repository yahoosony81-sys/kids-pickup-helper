# 네이버 지도 API 오류 해결 가이드

## 🔴 발생한 오류

1. **401 오류 (인증 실패)**
   - `oapi.map.naver.com/v…_maps_callback__0:1` - 401 오류
   - Client ID: `0ru9rtokfs`
   - URI: `https://kids-pickup-helper.vercel.app/pickup-requests/new`

2. **500 오류 (서버 내부 오류)**
   - NAVER Maps JavaScript API v3 - 500 Internal Server Error

3. **안드로이드 HTTP 평문 통신 경고**
   - 웹에서는 무시 가능 (안드로이드 앱 전용 경고)

---

## 🔍 원인 분석

### 가장 가능성 높은 원인

**네이버 클라우드 플랫폼 콘솔에서 Web 서비스 URL이 등록되지 않음**

네이버 지도 API는 보안을 위해 등록된 도메인에서만 사용할 수 있습니다. 현재 Vercel 도메인(`https://kids-pickup-helper.vercel.app`)이 등록되지 않아 401 오류가 발생하고 있습니다.

### 오류 메시지 분석

오류 메시지에서 확인할 수 있는 정보:
```
GET https://oapi.map.naver.com/v3/auth?ncpKeyId=0ru9rtokfs&url=https%3A%2F%2Fkids-pickup-helper.vercel.app%2Fpickup-requests%2Fnew 401 (Unauthorized)
```

- **인증 엔드포인트**: `/v3/auth` - 네이버 지도 API 인증 확인
- **Client ID**: `0ru9rtokfs` - 현재 사용 중인 API 키
- **요청 URL**: `https://kids-pickup-helper.vercel.app/pickup-requests/new` - 현재 페이지 URL
- **오류 코드**: `401 Unauthorized` - 인증 실패

이 오류는 **반드시** 네이버 클라우드 플랫폼 콘솔에서 도메인을 등록해야 해결됩니다.

---

## ✅ 해결 방법

### 1단계: 네이버 클라우드 플랫폼 콘솔 접속

1. **네이버 클라우드 플랫폼 콘솔** 접속
   - https://console.ncloud.com/
   - 로그인

2. **AI·NAVER API** 메뉴 선택
   - 좌측 메뉴에서 "AI·NAVER API" 클릭

3. **Application 등록** 메뉴 선택
   - "Application 등록" 또는 "내 애플리케이션" 클릭

4. **Client ID 확인**
   - Client ID: `0ru9rtokfs` 확인
   - 해당 애플리케이션 선택

### 2단계: Web 서비스 URL 등록 (⚠️ 가장 중요!)

1. **서비스 URL 설정** 섹션 찾기
   - 애플리케이션 상세 페이지에서 "서비스 URL" 또는 "Web 서비스 URL" 섹션 확인
   - 또는 "Application 등록" → "서비스 URL" 메뉴

2. **Vercel 도메인 추가** (반드시 정확히 입력)
   ```
   https://kids-pickup-helper.vercel.app
   ```
   - ⚠️ **주의사항**:
     - `https://`로 시작해야 함
     - 마지막에 `/` 없이 입력
     - 대소문자 구분 (소문자로 입력)
     - 공백 없이 입력

3. **추가 도메인 등록** (선택사항)
   - Preview 배포 URL도 사용한다면:
     ```
     https://kids-pickup-helper-*.vercel.app
     ```
   - 와일드카드(`*`)를 지원하지 않으면 각 Preview URL을 개별 등록

4. **로컬 개발용 URL 추가** (개발 환경용)
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```

5. **저장** 클릭
   - 저장 후 변경사항이 즉시 적용되는지 확인
   - 일부 경우 몇 분 정도 소요될 수 있음

### 3단계: API 서비스 활성화 확인

1. **활성화된 API 서비스** 확인
   - 다음 API들이 활성화되어 있는지 확인:
     - ✅ **Dynamic Map API** (필수)
     - ✅ **Geocoding API** (필수)
     - ✅ **Reverse Geocoding API** (필수)
     - ✅ **Places API** (선택사항, 장소 검색용)

2. **API가 비활성화되어 있다면**
   - 각 API 옆의 "활성화" 버튼 클릭
   - 약관 동의 후 활성화

### 4단계: Vercel 재배포

1. **환경 변수 확인**
   - Vercel 대시보드에서 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 값 확인
   - 값이 `0ru9rtokfs`와 일치하는지 확인

2. **재배포**
   - Vercel 대시보드에서 "Redeploy" 버튼 클릭
   - 또는 Git에 커밋 후 자동 배포 대기

### 5단계: 테스트

1. **브라우저에서 페이지 접속**
   - `https://kids-pickup-helper.vercel.app/pickup-requests/new`

2. **브라우저 개발자 도구 확인**
   - F12 키 누르기
   - Console 탭에서 오류 메시지 확인
   - Network 탭에서 네이버 지도 API 호출 확인

3. **정상 작동 확인**
   - 지도가 표시되는지 확인
   - 주소 검색이 작동하는지 확인
   - 지도 클릭으로 위치 선택이 작동하는지 확인

---

## 🔧 추가 확인 사항

### API 키 확인

1. **Client ID 형식 확인**
   - 올바른 형식: 영문자와 숫자 조합 (예: `0ru9rtokfs`)
   - 잘못된 형식: 공백, 특수문자 포함

2. **API 키 권한 확인**
   - 네이버 클라우드 플랫폼 콘솔에서 API 키 권한 확인
   - 필요한 API 권한이 모두 부여되어 있는지 확인

### 네트워크 문제 확인

1. **CORS 정책**
   - 브라우저 콘솔에서 CORS 관련 오류 확인
   - 네이버 클라우드 플랫폼 콘솔에서 CORS 설정 확인

2. **방화벽/프록시**
   - 회사 네트워크나 방화벽이 네이버 지도 API를 차단하는지 확인
   - 개인 네트워크에서 테스트

---

## 📝 체크리스트

해결 과정을 단계별로 확인하세요:

- [ ] 네이버 클라우드 플랫폼 콘솔 접속 완료
- [ ] Client ID `0ru9rtokfs` 확인 완료
- [ ] Web 서비스 URL에 `https://kids-pickup-helper.vercel.app` 추가 완료
- [ ] Dynamic Map API 활성화 확인 완료
- [ ] Geocoding API 활성화 확인 완료
- [ ] Reverse Geocoding API 활성화 확인 완료
- [ ] Vercel 환경 변수 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 확인 완료
- [ ] Vercel 재배포 완료
- [ ] 브라우저에서 지도 표시 확인 완료
- [ ] 주소 검색 기능 작동 확인 완료

---

## 🆘 여전히 오류가 발생한다면

### 1. 브라우저 콘솔 로그 확인

브라우저 개발자 도구(F12) → Console 탭에서 다음 로그 확인:

```
🗺️ [네이버 지도] 스크립트 로드 시작
1️⃣ 환경 변수 확인
2️⃣ 기존 스크립트 확인
3️⃣ 스크립트 URL 생성
```

오류 메시지가 있다면 스크린샷을 찍어 보관하세요.

### 2. 네이버 클라우드 플랫폼 고객센터 문의

- 네이버 클라우드 플랫폼 고객센터: 1588-3819
- 또는 콘솔 내 "문의하기" 기능 사용
- 다음 정보를 함께 제공:
  - Client ID: `0ru9rtokfs`
  - 오류 메시지: 401, 500 오류
  - 도메인: `https://kids-pickup-helper.vercel.app`

### 3. 대안: 다른 지도 API 사용 고려

네이버 지도 API가 계속 문제가 있다면:
- 카카오맵 API
- 구글 맵스 API
- 다음 지도 API

---

## 📚 참고 자료

- [네이버 클라우드 플랫폼 콘솔](https://console.ncloud.com/)
- [네이버 지도 API v3 가이드](https://navermaps.github.io/maps.js.ncp/)
- [네이버 지도 API 서비스 URL 등록 가이드](https://guide.ncloud-docs.com/docs/naveropenapiv3-web-dynamic-map)

---

## 💡 예방 방법

### 개발 환경별 URL 등록

다음 URL들을 모두 등록해두면 개발/프로덕션 환경 모두에서 작동합니다:

```
# 로컬 개발
http://localhost:3000
http://127.0.0.1:3000

# Vercel 프로덕션
https://kids-pickup-helper.vercel.app

# Vercel Preview (선택사항)
https://kids-pickup-helper-*.vercel.app
```

### 환경 변수 관리

- 로컬 `.env` 파일과 Vercel 환경 변수가 일치하는지 정기적으로 확인
- 환경 변수 변경 시 즉시 재배포

---

**작성일**: 2025-01-01  
**마지막 업데이트**: 2025-01-01

