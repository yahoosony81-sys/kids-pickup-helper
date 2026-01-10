# 달력 기반 UI 전환 - 설치 가이드

## 필수 패키지 설치

달력 컴포넌트를 사용하기 위해 다음 패키지를 설치해야 합니다:

```bash
pnpm add react-day-picker
```

## 설치 후 확인

설치가 완료되면 다음 파일들이 정상적으로 작동합니다:

- `components/calendar/pickup-calendar.tsx`
- `app/(routes)/pickup-requests/new/page.tsx`
- `app/(routes)/trips/new/page.tsx`
- `app/(routes)/my/page.tsx`

## 주요 변경 사항

### 1. 서비스 신청 화면
- 기존: `datetime-local` input
- 변경: 달력 → 날짜 선택 → 시간 슬롯 선택 (30분 단위)

### 2. 마이페이지
- 기존: 리스트 형태
- 변경: 달력 기본 화면 + 날짜 클릭 시 상세 리스트

### 3. 집계 서버 함수
- `actions/calendar-stats.ts`: 날짜별 집계 데이터 제공
- 모든 집계는 read-only 함수로 분리

## 문제 해결

### react-day-picker 관련 오류
만약 `react-day-picker`를 찾을 수 없다는 오류가 발생하면:
1. `pnpm add react-day-picker` 실행
2. 개발 서버 재시작

### 달력이 표시되지 않는 경우
1. 브라우저 콘솔에서 오류 확인
2. `components/calendar/pickup-calendar.tsx`의 import 확인
3. react-day-picker 버전 확인 (최신 버전 권장)
