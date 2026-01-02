# Supabase 설정 가이드

이 문서는 [Supabase 공식 Next.js 퀵스타트 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)를 기반으로 작성되었습니다.

## 개요

이 프로젝트는 Supabase를 데이터베이스로 사용하며, Clerk와의 네이티브 통합을 지원합니다.

## Supabase 프로젝트 생성

1. [database.new](https://database.new)에 접속하여 새 Supabase 프로젝트 생성
2. 또는 [Supabase Dashboard](https://supabase.com/dashboard)에서 **"New Project"** 클릭
3. 프로젝트 정보 입력:
   - **Name**: 원하는 프로젝트 이름
   - **Database Password**: 안전한 비밀번호 생성
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 서비스용)
   - **Pricing Plan**: Free 또는 Pro 선택
4. 프로젝트가 준비될 때까지 대기 (~2분)

## 환경 변수 설정

### 1. Supabase Dashboard에서 값 가져오기

1. Supabase Dashboard → **Settings** → **API** 메뉴로 이동
2. 다음 값들을 복사:

   - **Project URL**: `https://your-project.supabase.co`
   - **API Keys**:
     - **Publishable key** (새 형식, 권장): `sb_publishable_xxx`
     - 또는 **Anon key** (레거시): `eyJhbGc...`
     - **Service role key** (서버 사이드 전용): `eyJhbGc...`

### 2. .env 파일에 추가

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
# 또는 레거시 anon key (하위 호환성)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
# Service role key (서버 사이드 전용, 절대 공개 금지)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
# Storage bucket name
NEXT_PUBLIC_STORAGE_BUCKET=uploads
```

> **참고**: 
> - Supabase는 새로운 Publishable key 형식(`sb_publishable_xxx`)을 권장합니다.
> - 기존 anon key도 계속 사용 가능합니다.
> - 프로젝트의 **Connect** 다이얼로그에서 올바른 키를 가져올 수 있습니다.

## Supabase 클라이언트 사용법

### Server Component에서 사용

```tsx
import { createClient } from '@/lib/supabase/server';

export default async function MyPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('table').select('*');
  
  if (error) {
    throw error;
  }
  
  return <div>{/* 데이터 표시 */}</div>;
}
```

### Clerk 통합 클라이언트 사용 (인증 필요 시)

```tsx
import { createClerkSupabaseClient } from '@/lib/supabase/server';

export default async function MyPage() {
  const supabase = createClerkSupabaseClient();
  // Clerk 세션 토큰이 자동으로 포함됩니다
  const { data } = await supabase.from('table').select('*');
  return <div>{/* 데이터 표시 */}</div>;
}
```

### Client Component에서 사용

```tsx
'use client';

import { useClerkSupabaseClient } from '@/lib/supabase/clerk-client';

export default function MyComponent() {
  const supabase = useClerkSupabaseClient();
  
  async function fetchData() {
    const { data } = await supabase.from('table').select('*');
    return data;
  }
  
  return <div>{/* 컴포넌트 내용 */}</div>;
}
```

## 예시: Instruments 테이블 생성

Supabase 공식 문서의 예시를 따라 `instruments` 테이블을 생성할 수 있습니다.

### 1. Supabase SQL Editor에서 실행

1. Supabase Dashboard → **SQL Editor** 메뉴
2. **"New query"** 클릭
3. 다음 SQL 실행:

```sql
-- 테이블 생성
CREATE TABLE instruments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL
);

-- 샘플 데이터 삽입
INSERT INTO instruments (name)
VALUES
  ('violin'),
  ('viola'),
  ('cello');

-- RLS 활성화
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 생성
CREATE POLICY "public can read instruments"
ON public.instruments
FOR SELECT TO anon
USING (true);
```

### 2. 테스트 페이지 확인

프로젝트를 실행하고 `/instruments` 페이지를 방문하면 데이터를 확인할 수 있습니다:

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000/instruments](http://localhost:3000/instruments) 접속

## API Keys 변경 사항

Supabase는 보안과 개발자 경험을 개선하기 위해 키 작동 방식을 변경하고 있습니다.

### 새 형식: Publishable Key

- 형식: `sb_publishable_xxx`
- 용도: 클라이언트 사이드 작업
- 위치: 프로젝트 설정 → API Keys → **API Keys** 탭

### 레거시 형식: Anon Key

- 형식: `eyJhbGc...`
- 용도: 클라이언트 사이드 작업 (하위 호환성)
- 위치: 프로젝트 설정 → API Keys → **Legacy API Keys** 탭

### Service Role Key

- 용도: 서버 사이드 작업 (RLS 우회)
- 위치: 프로젝트 설정 → API Keys → **Legacy API Keys** 탭
- **⚠️ 절대 클라이언트에 노출하지 마세요!**

## 참고 자료

- [Supabase Next.js 퀵스타트 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase API Keys 문서](https://supabase.com/docs/guides/api/api-keys)
- [Clerk + Supabase 통합 가이드](./CLERK_SUPABASE_INTEGRATION.md)

