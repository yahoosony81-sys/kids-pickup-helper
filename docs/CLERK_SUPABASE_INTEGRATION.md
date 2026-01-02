# Clerk + Supabase 통합 가이드

이 문서는 [Clerk 공식 문서](https://clerk.com/docs/guides/development/integrations/databases/supabase)를 기반으로 작성되었습니다.

## 개요

Clerk와 Supabase를 통합하면 다음과 같은 이점이 있습니다:

- ✅ **JWT 템플릿 불필요**: 2025년 4월 이후 네이티브 통합 사용 (JWT 템플릿 deprecated)
- ✅ **자동 인증**: Clerk 세션 토큰이 Supabase에서 자동으로 검증됨
- ✅ **RLS 정책 지원**: Clerk 사용자 ID를 기반으로 Row Level Security 정책 작성 가능
- ✅ **간편한 설정**: Clerk Dashboard에서 한 번의 클릭으로 통합 활성화

## 설정 단계

### 1단계: Clerk Dashboard에서 Supabase Integration 활성화

1. [Clerk Dashboard](https://dashboard.clerk.com/)에 접속
2. 프로젝트 선택
3. **Settings** → **Integrations** 메뉴로 이동
4. **Supabase** 섹션 찾기
5. **"Activate Supabase integration"** 클릭
6. 설정 옵션 선택 후 **"Activate"** 클릭
7. **Clerk domain** 값이 표시됩니다 (예: `your-app-12.clerk.accounts.dev`)
   - 이 값을 복사하여 메모해두세요

> **중요**: 이 단계를 완료하면 Clerk 세션 토큰에 `"role": "authenticated"` JWT claim이 자동으로 추가됩니다.

### 2단계: Supabase Dashboard에서 Clerk Provider 설정

1. [Supabase Dashboard](https://supabase.com/dashboard)로 이동
2. 프로젝트 선택
3. **Settings** → **Authentication** → **Providers** 메뉴로 이동
4. 페이지 하단으로 스크롤하여 **"Third-Party Auth"** 섹션 찾기
5. **"Add provider"** 클릭
6. **"Clerk"** 선택
7. **"Clerk domain"** 필드에 1단계에서 복사한 Clerk domain 입력
   - 예: `your-app-12.clerk.accounts.dev`
8. **"Save"** 클릭

> **참고**: Supabase는 Clerk domain을 사용하여 자동으로 다음을 구성합니다:
> - JWT Issuer URL: `https://your-app-12.clerk.accounts.dev`
> - JWKS Endpoint: `https://your-app-12.clerk.accounts.dev/.well-known/jwks.json`

## 코드 사용법

### Client Component에서 사용

```tsx
'use client';

import { useClerkSupabaseClient } from '@/lib/supabase/clerk-client';
import { useUser } from '@clerk/nextjs';

export default function MyComponent() {
  const { user, isLoaded } = useUser();
  const supabase = useClerkSupabaseClient();

  async function fetchData() {
    if (!user) return;
    
    // Clerk 세션 토큰이 자동으로 Supabase 요청에 포함됩니다
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    return data;
  }

  return <div>...</div>;
}
```

### Server Component에서 사용

```tsx
import { createClerkSupabaseClient } from '@/lib/supabase/server';

export default async function MyPage() {
  const supabase = createClerkSupabaseClient();
  
  // Clerk 세션 토큰이 자동으로 Supabase 요청에 포함됩니다
  const { data, error } = await supabase
    .from('tasks')
    .select('*');
  
  if (error) {
    throw error;
  }
  
  return (
    <div>
      {data?.map((task) => (
        <div key={task.id}>{task.name}</div>
      ))}
    </div>
  );
}
```

### Server Action에서 사용

```ts
'use server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';

export async function addTask(name: string) {
  const supabase = createClerkSupabaseClient();
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({ name });
  
  if (error) {
    throw new Error('Failed to add task');
  }
  
  return data;
}
```

## RLS (Row Level Security) 정책 설정

Clerk 사용자 ID를 기반으로 RLS 정책을 작성할 수 있습니다. Supabase의 `auth.jwt()` 함수를 사용하여 Clerk 사용자 ID에 접근할 수 있습니다.

### 예시: 사용자 자신의 데이터만 조회

```sql
-- 테이블 생성
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT auth.jwt()->>'sub'
);

-- RLS 활성화
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- SELECT 정책: 사용자는 자신의 tasks만 조회 가능
CREATE POLICY "User can view their own tasks"
ON tasks
FOR SELECT
TO authenticated
USING (
  ((SELECT auth.jwt()->>'sub') = user_id::text)
);

-- INSERT 정책: 사용자는 자신의 tasks만 생성 가능
CREATE POLICY "Users must insert their own tasks"
ON tasks
FOR INSERT
TO authenticated
WITH CHECK (
  ((SELECT auth.jwt()->>'sub') = user_id::text)
);
```

> **참고**: `auth.jwt()->>'sub'`는 Clerk 사용자 ID를 반환합니다.

## 환경 변수

`.env` 파일에 다음 환경 변수가 설정되어 있어야 합니다:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 문제 해결

### "Unauthorized" 오류가 발생하는 경우

1. Clerk Dashboard에서 Supabase integration이 활성화되어 있는지 확인
2. Supabase Dashboard에서 Clerk provider가 올바르게 설정되어 있는지 확인
3. Clerk domain이 정확히 입력되었는지 확인

### RLS 정책이 작동하지 않는 경우

1. 테이블에 RLS가 활성화되어 있는지 확인:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. 정책이 올바르게 생성되었는지 확인:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'your_table_name';
   ```

3. `auth.jwt()->>'sub'`가 올바른 Clerk 사용자 ID를 반환하는지 확인:
   ```sql
   SELECT auth.jwt()->>'sub';
   ```

## 참고 자료

- [Clerk 공식 통합 가이드](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase Third-Party Auth 문서](https://supabase.com/docs/guides/auth/third-party/overview)
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)

