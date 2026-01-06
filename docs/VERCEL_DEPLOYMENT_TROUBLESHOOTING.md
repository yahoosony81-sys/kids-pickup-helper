# Vercel 배포 실패 문제 해결 가이드

## 🔍 문제 진단을 위해 필요한 정보

Vercel 배포가 실패할 때, 다음 정보를 제공해주시면 정확한 원인을 파악할 수 있습니다.

---

## 1️⃣ Vercel 배포 로그 확인하기

가장 중요한 정보입니다! Vercel 대시보드에서 실제 에러 메시지를 확인해야 합니다.

### 확인 방법:
1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. 실패한 배포를 클릭
3. **"Build Logs"** 또는 **"Deployment Logs"** 탭 클릭
4. 빨간색으로 표시된 에러 메시지 전체를 복사

### 제공해주실 정보:
- ❌ **에러 메시지 전체** (특히 빨간색으로 표시된 부분)
- ❌ **어느 단계에서 실패했는지** (예: "Installing dependencies", "Building", "Deploying")
- ❌ **마지막으로 성공한 단계**

---

## 2️⃣ 환경 변수 확인

Vercel에서 환경 변수가 제대로 설정되어 있는지 확인이 필요합니다.

### 확인 방법:
1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Environment Variables** 클릭
3. 다음 변수들이 모두 설정되어 있는지 확인:

```
필수 환경 변수:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_SIGN_IN_URL
- NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
- NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_STORAGE_BUCKET
```

### 제공해주실 정보:
- ✅ **어떤 환경 변수가 설정되어 있는지** (값은 공개하지 마세요!)
- ❌ **누락된 환경 변수가 있는지**
- ❌ **환경 변수 이름에 오타가 있는지** (대소문자, 언더스코어 등)

---

## 3️⃣ 로컬 빌드 테스트 결과

터미널에서 빌드가 성공했다고 하셨는데, 정확한 명령어와 결과를 확인해야 합니다.

### 로컬에서 테스트해볼 명령어:

```bash
# 1. 의존성 설치
pnpm install

# 2. 프로덕션 빌드 (Vercel과 동일한 환경)
pnpm build

# 3. 빌드 결과 확인
pnpm start
```

### 제공해주실 정보:
- ✅ **`pnpm build` 명령어 실행 결과** (전체 출력)
- ❌ **빌드 중 경고나 에러 메시지가 있었는지**
- ✅ **`pnpm start` 후 실제로 서버가 실행되는지**

---

## 4️⃣ Node.js 버전 확인

Vercel과 로컬 환경의 Node.js 버전이 다를 수 있습니다.

### 확인 방법:

**로컬 환경:**
```bash
node --version
```

**Vercel 설정:**
1. Vercel 대시보드 → 프로젝트 → Settings
2. **General** → **Node.js Version** 확인

### 제공해주실 정보:
- ✅ **로컬 Node.js 버전** (예: v20.11.0)
- ✅ **Vercel에 설정된 Node.js 버전** (또는 설정 안 되어 있는지)

---

## 5️⃣ package.json 확인

빌드 스크립트와 의존성 버전을 확인합니다.

### 제공해주실 정보:
- ✅ **package.json 파일 내용** (이미 확인했지만, 최신 상태인지)
- ❌ **최근에 package.json을 수정했는지**

---

## 6️⃣ Vercel 프로젝트 설정 확인

Vercel 프로젝트의 빌드 설정을 확인합니다.

### 확인 방법:
1. Vercel 대시보드 → 프로젝트 → Settings
2. **General** 탭에서 확인:
   - **Framework Preset**: Next.js로 설정되어 있는지
   - **Build Command**: `pnpm build` 또는 `next build`인지
   - **Output Directory**: `.next` 또는 비어있는지
   - **Install Command**: `pnpm install`인지

### 제공해주실 정보:
- ✅ **Framework Preset 값**
- ✅ **Build Command 값**
- ✅ **Output Directory 값**
- ✅ **Install Command 값**

---

## 7️⃣ Git 저장소 상태 확인

Vercel은 Git 저장소와 연결되어 배포합니다.

### 확인 방법:
```bash
# 현재 브랜치 확인
git branch

# 최근 커밋 확인
git log --oneline -5
```

### 제공해주실 정보:
- ✅ **어떤 브랜치에서 배포하고 있는지** (예: main, master)
- ✅ **최근 커밋이 정상적으로 푸시되었는지**

---

## 8️⃣ 일반적인 배포 실패 원인 체크리스트

다음 항목들을 확인해보세요:

- [ ] **환경 변수 누락**: Vercel에 모든 환경 변수가 설정되어 있는가?
- [ ] **의존성 문제**: `package-lock.json`과 `pnpm-lock.yaml`이 충돌하는가?
- [ ] **메모리 부족**: 빌드 중 메모리 제한 초과 에러가 있는가?
- [ ] **타임아웃**: 빌드가 너무 오래 걸려서 타임아웃되는가?
- [ ] **TypeScript 에러**: 타입 에러가 빌드를 막고 있는가?
- [ ] **ESLint 에러**: 린트 에러가 빌드를 막고 있는가?
- [ ] **파일 크기**: 특정 파일이 너무 커서 문제가 되는가?

---

## 📋 정보 제공 템플릿

다음 형식으로 정보를 제공해주시면 빠르게 문제를 해결할 수 있습니다:

```
## Vercel 배포 실패 정보

### 1. 에러 메시지
[Vercel Build Logs에서 복사한 전체 에러 메시지]

### 2. 실패 단계
[ ] Installing dependencies
[ ] Building
[ ] Deploying
[ ] 기타: ___________

### 3. 환경 변수
- 설정된 변수: [변수 이름만 나열]
- 누락된 변수: [없으면 "없음"]

### 4. 로컬 빌드 결과
```
[pnpm build 실행 결과 전체]
```

### 5. Node.js 버전
- 로컬: ___________
- Vercel: ___________

### 6. Vercel 프로젝트 설정
- Framework Preset: ___________
- Build Command: ___________
- Output Directory: ___________
- Install Command: ___________

### 7. Git 상태
- 배포 브랜치: ___________
- 최근 커밋: ___________
```

---

## 🚀 빠른 해결 시도

정보를 기다리는 동안 다음을 시도해볼 수 있습니다:

### 1. Vercel 프로젝트 재배포
- Vercel 대시보드에서 "Redeploy" 버튼 클릭

### 2. 환경 변수 재확인
- 모든 환경 변수가 올바르게 설정되어 있는지 다시 확인
- 특히 `NEXT_PUBLIC_`로 시작하는 변수는 반드시 필요

### 3. 로컬에서 프로덕션 빌드 테스트
```bash
pnpm install
pnpm build
pnpm start
```

### 4. Vercel 빌드 설정 초기화
- Settings → General에서 "Override" 버튼을 눌러 기본값으로 재설정

---

## 💡 다음 단계

위 정보를 제공해주시면, 정확한 원인을 파악하고 해결 방법을 제시해드리겠습니다!

특히 **Vercel Build Logs의 에러 메시지**가 가장 중요합니다. 이 메시지만 있어도 대부분의 문제를 해결할 수 있습니다.

