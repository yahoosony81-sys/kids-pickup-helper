/**
 * @file app/instruments/page.tsx
 * @description Supabase 공식 문서 예시 페이지
 *
 * 이 페이지는 Supabase 공식 Next.js 퀵스타트 가이드를 기반으로 작성되었습니다.
 * @see https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
 */

import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function InstrumentsData() {
  const supabase = await createClient();
  const { data: instruments, error } = await supabase.from("instruments").select();

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
        <p className="text-sm font-medium text-destructive">오류</p>
        <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
        <div className="mt-3 text-xs text-destructive/70">
          <p className="font-medium mb-1">해결 방법:</p>
          <p>Supabase Dashboard에서 instruments 테이블을 생성해주세요.</p>
          <pre className="bg-background p-2 rounded border overflow-x-auto mt-2">
            {`-- Supabase SQL Editor에서 실행:
CREATE TABLE instruments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL
);

INSERT INTO instruments (name)
VALUES
  ('violin'),
  ('viola'),
  ('cello');

ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read instruments"
ON public.instruments
FOR SELECT TO anon
USING (true);`}
          </pre>
        </div>
      </div>
    );
  }

  return <pre>{JSON.stringify(instruments, null, 2)}</pre>;
}

export default function Instruments() {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Instruments</h1>
        <p className="text-muted-foreground">
          Supabase 공식 Next.js 퀵스타트 가이드 예시입니다.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          <a
            href="https://supabase.com/docs/guides/getting-started/quickstarts/nextjs"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            공식 문서 보기
          </a>
        </p>
      </div>

      <Suspense fallback={<div>Loading instruments...</div>}>
        <InstrumentsData />
      </Suspense>
    </div>
  );
}

