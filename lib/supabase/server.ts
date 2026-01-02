import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * @file lib/supabase/server.ts
 * @description Supabase 서버 사이드 클라이언트 생성 함수
 *
 * 이 파일은 Supabase 공식 문서 패턴을 따르면서 Clerk 통합을 지원합니다.
 * @see https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
 * @see https://clerk.com/docs/guides/development/integrations/databases/supabase
 */

/**
 * Supabase 공식 문서 패턴: 기본 클라이언트 생성
 *
 * Supabase 공식 Next.js 퀵스타트 가이드를 따릅니다.
 * 인증이 필요 없는 공개 데이터 조회에 사용합니다.
 *
 * @see https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
 *
 * @example
 * ```tsx
 * // Server Component
 * import { createClient } from '@/lib/supabase/server';
 *
 * export default async function Instruments() {
 *   const supabase = await createClient();
 *   const { data: instruments } = await supabase.from('instruments').select();
 *   return <pre>{JSON.stringify(instruments, null, 2)}</pre>;
 * }
 * ```
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Clerk + Supabase 네이티브 통합 클라이언트 (Server Component/Server Action용)
 *
 * 2025년 4월부터 권장되는 방식 (Clerk 공식 문서 기준):
 * - JWT 템플릿 불필요 (deprecated)
 * - Clerk Dashboard에서 Supabase integration 활성화 필요
 * - Clerk 토큰을 Supabase가 자동 검증
 * - auth().getToken()으로 현재 세션 토큰 사용
 *
 * @see https://clerk.com/docs/guides/development/integrations/databases/supabase
 *
 * @example
 * ```tsx
 * // Server Component
 * import { createClerkSupabaseClient } from '@/lib/supabase/server';
 *
 * export default async function MyPage() {
 *   const supabase = createClerkSupabaseClient();
 *   const { data } = await supabase.from('table').select('*');
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example
 * ```ts
 * // Server Action
 * 'use server';
 *
 * import { createClerkSupabaseClient } from '@/lib/supabase/server';
 *
 * export async function addTask(name: string) {
 *   const supabase = createClerkSupabaseClient();
 *   await supabase.from('tasks').insert({ name });
 * }
 * ```
 */
export function createClerkSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey, {
    async accessToken() {
      return (await auth()).getToken();
    },
  });
}
