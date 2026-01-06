# Vercel 배포 실패 원인 분석

[Vercel 공식 문서](https://vercel.com/docs)를 참고하여 배포 실패 원인을 분석했습니다.

## 🔴 발견된 주요 문제점

### 1. **pnpm-lock.yaml 파일이 Git에 커밋되지 않음** ⚠️ **가장 중요**

**문제:**
- `.gitignore` 파일에 `pnpm-lock.yaml`이 포함되어 있어 Git에 커밋되지 않습니다
- Vercel은 `pnpm-lock.yaml` 파일이 없으면 pnpm을 제대로 인식하지 못할 수 있습니다

**Vercel 문서 참고:**
- Vercel은 프로젝트 루트에 있는 lock 파일을 기반으로 패키지 매니저를 자동 감지합니다
- `pnpm-lock.yaml`이 없으면 npm을 기본으로 사용하려고 시도할 수 있습니다

**해결 방법:**
1. `.gitignore`에서 `pnpm-lock.yaml` 제거
2. `pnpm-lock.yaml` 파일을 Git에 커밋
3. Vercel에 재배포

---

### 2. **package.json에 packageManager 필드 없음**

**문제:**
- `package.json`에 `packageManager` 필드가 없어 Vercel이 pnpm 버전을 정확히 알 수 없습니다

**해결 방법:**
`package.json`에 다음 필드를 추가:

```json
{
  "packageManager": "pnpm@9.0.0"
}
```

> **참고:** 실제 사용 중인 pnpm 버전을 확인하려면 터미널에서 `pnpm --version` 실행

---

### 3. **환경 변수 3개 누락** (이미 확인됨)

누락된 환경 변수:
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`

**해결 방법:**
- Vercel 대시보드 → Settings → Environment Variables에서 추가
- 자세한 내용은 `docs/ENV_VARIABLES_CHECK.md` 참고

---

## 📋 Vercel 문서 기반 체크리스트

### 패키지 매니저 설정

- [ ] **pnpm-lock.yaml이 Git에 커밋되어 있는가?**
  - 현재: ❌ `.gitignore`에 포함되어 커밋 안 됨
  - 필요: ✅ Git에 커밋되어야 함

- [ ] **package.json에 packageManager 필드가 있는가?**
  - 현재: ❌ 없음
  - 필요: ✅ `"packageManager": "pnpm@버전"` 추가

- [ ] **Vercel 프로젝트 설정에서 Install Command가 올바른가?**
  - 확인 필요: Vercel 대시보드 → Settings → General
  - 권장: `pnpm install` 또는 비워두기 (자동 감지)

### 빌드 설정

- [ ] **Framework Preset이 Next.js로 설정되어 있는가?**
  - 확인 필요: Vercel 대시보드 → Settings → General

- [ ] **Build Command가 올바른가?**
  - 권장: `pnpm build` 또는 `next build`
  - 확인 필요: Vercel 대시보드 → Settings → General

- [ ] **Output Directory가 올바른가?**
  - Next.js의 경우: 비워두거나 `.next` (자동 감지)

### 환경 변수

- [ ] **모든 필수 환경 변수가 설정되어 있는가?**
  - 현재: ❌ 3개 누락
  - 필요: ✅ 12개 모두 설정

---

## 🔧 즉시 해결 방법

### 1단계: pnpm-lock.yaml 커밋

```bash
# 1. .gitignore 수정 (pnpm-lock.yaml 제거)
# 2. pnpm-lock.yaml 생성 (이미 있다면 스킵)
pnpm install

# 3. Git에 추가 및 커밋
git add pnpm-lock.yaml
git add .gitignore
git commit -m "fix: Add pnpm-lock.yaml for Vercel deployment"
git push
```

### 2단계: package.json에 packageManager 추가

`package.json` 파일을 열고 다음을 추가:

```json
{
  "name": "saas-mini-course",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    ...
  }
}
```

> **참고:** 실제 pnpm 버전 확인: `pnpm --version`

### 3단계: 환경 변수 추가

Vercel 대시보드에서 누락된 3개 환경 변수 추가 (자세한 내용은 `docs/ENV_VARIABLES_CHECK.md` 참고)

### 4단계: Vercel 프로젝트 설정 확인

Vercel 대시보드 → 프로젝트 → Settings → General에서:

- **Framework Preset**: `Next.js`
- **Build Command**: `pnpm build` 또는 비워두기
- **Install Command**: `pnpm install` 또는 비워두기
- **Output Directory**: 비워두기 (자동 감지)
- **Node.js Version**: `20.x` 권장

### 5단계: 재배포

- Git에 푸시하면 자동 재배포
- 또는 Vercel 대시보드에서 "Redeploy" 클릭

---

## 🔍 추가 확인 사항

### Vercel이 pnpm을 인식하는 방법

Vercel은 다음 순서로 패키지 매니저를 감지합니다:

1. **package.json의 `packageManager` 필드** (가장 우선)
2. **Lock 파일 존재 여부**
   - `pnpm-lock.yaml` → pnpm
   - `yarn.lock` → yarn
   - `package-lock.json` → npm
3. **프로젝트 설정의 Install Command**

현재 상황:
- ❌ `packageManager` 필드 없음
- ❌ `pnpm-lock.yaml`이 Git에 없음
- ✅ Vercel 설정에서 수동으로 지정 가능

---

## 📚 참고 자료

- [Vercel 공식 문서 - Package Managers](https://vercel.com/docs)
- [Vercel 공식 문서 - Environment Variables](https://vercel.com/docs/build-and-deploy/environment-variables)
- [Vercel 공식 문서 - Build Settings](https://vercel.com/docs/build-and-deploy/build-configuration)

---

## 🎯 우선순위

1. **🔴 최우선**: pnpm-lock.yaml Git에 커밋
2. **🟡 중요**: package.json에 packageManager 필드 추가
3. **🟡 중요**: 환경 변수 3개 추가
4. **🟢 확인**: Vercel 프로젝트 설정 확인

---

## 💡 예상 결과

위 문제들을 해결하면:
- ✅ Vercel이 pnpm을 정확히 인식
- ✅ 의존성 설치가 올바르게 진행
- ✅ 빌드가 성공적으로 완료
- ✅ 배포가 정상적으로 완료

