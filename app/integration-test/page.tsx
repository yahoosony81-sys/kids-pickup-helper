"use client";

/**
 * @file integration-test/page.tsx
 * @description Clerk + Supabase 통합 테스트 페이지
 *
 * 이 페이지는 Clerk 공식 문서의 예시를 기반으로 작성되었습니다.
 * Clerk와 Supabase의 네이티브 통합이 올바르게 작동하는지 테스트합니다.
 *
 * @see https://clerk.com/docs/guides/development/integrations/databases/supabase
 */

import { useState, useEffect } from "react";
import { useUser, useSession } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuCheck, LuX, LuLoader2, LuAlertCircle } from "react-icons/lu";

interface Task {
  id: number;
  name: string;
  user_id: string;
  created_at?: string;
}

export default function IntegrationTestPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { session, isLoaded: sessionLoaded } = useSession();
  const supabase = useClerkSupabaseClient();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    hasToken: boolean;
    userId: string | null;
  } | null>(null);

  // 세션 토큰 정보 확인
  useEffect(() => {
    async function checkToken() {
      if (sessionLoaded && session) {
        const token = await session.getToken();
        setTokenInfo({
          hasToken: !!token,
          userId: user?.id || null,
        });
      }
    }
    checkToken();
  }, [session, sessionLoaded, user]);

  // 작업 목록 불러오기
  useEffect(() => {
    if (!userLoaded || !user) return;

    async function loadTasks() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) {
          // 테이블이 없으면 에러 메시지 표시
          if (fetchError.code === "PGRST116" || fetchError.message.includes("relation")) {
            setError("tasks 테이블이 존재하지 않습니다. 먼저 데이터베이스에 테이블을 생성해주세요.");
          } else {
            throw fetchError;
          }
        } else {
          setTasks(data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "작업 목록을 불러오는데 실패했습니다.");
        console.error("Load tasks error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [user, userLoaded, supabase]);

  // 새 작업 추가
  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !taskName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert({
          name: taskName.trim(),
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        // 테이블이 없으면 에러 메시지 표시
        if (insertError.code === "PGRST116" || insertError.message.includes("relation")) {
          setError("tasks 테이블이 존재하지 않습니다. 먼저 데이터베이스에 테이블을 생성해주세요.");
        } else {
          throw insertError;
        }
      } else {
        setTasks([data, ...tasks]);
        setTaskName("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업 추가에 실패했습니다.");
      console.error("Add task error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!userLoaded || !sessionLoaded) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <LuLoader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Clerk + Supabase 통합 테스트</CardTitle>
            <CardDescription>
              이 페이지를 사용하려면 먼저 로그인해주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Clerk + Supabase 통합 테스트</CardTitle>
          <CardDescription>
            Clerk 공식 문서를 기반으로 한 통합 테스트 페이지입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 통합 상태 확인 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {tokenInfo?.hasToken ? (
                <>
                  <LuCheck className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Clerk 세션 토큰: 연결됨</span>
                </>
              ) : (
                <>
                  <LuX className="h-5 w-5 text-red-500" />
                  <span className="text-sm">Clerk 세션 토큰: 연결 안 됨</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <LuCheck className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Clerk 사용자: {user.emailAddresses[0]?.emailAddress || user.id}</span>
                </>
              ) : (
                <>
                  <LuX className="h-5 w-5 text-red-500" />
                  <span className="text-sm">Clerk 사용자: 없음</span>
                </>
              )}
            </div>
            {tokenInfo?.userId && (
              <div className="text-xs text-muted-foreground">
                Clerk User ID: {tokenInfo.userId}
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-start gap-2">
                <LuAlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">오류</p>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                  {error.includes("테이블이 존재하지 않습니다") && (
                    <div className="mt-3 text-xs text-destructive/70">
                      <p className="font-medium mb-1">해결 방법:</p>
                      <pre className="bg-background p-2 rounded border overflow-x-auto">
                        {`-- Supabase SQL Editor에서 실행:
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT auth.jwt()->>'sub',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view their own tasks"
ON tasks FOR SELECT
TO authenticated
USING (((SELECT auth.jwt()->>'sub') = user_id::text));

CREATE POLICY "Users must insert their own tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (((SELECT auth.jwt()->>'sub') = user_id::text));`}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 작업 추가 폼 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>새 작업 추가</CardTitle>
          <CardDescription>
            Clerk 세션 토큰이 자동으로 Supabase 요청에 포함됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">작업 이름</Label>
              <Input
                id="task-name"
                type="text"
                placeholder="작업 이름을 입력하세요"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" disabled={loading || !taskName.trim()}>
              {loading ? (
                <>
                  <LuLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  추가 중...
                </>
              ) : (
                "작업 추가"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 작업 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>내 작업 목록</CardTitle>
          <CardDescription>
            현재 사용자({user.id})의 작업만 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && tasks.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <LuLoader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              작업이 없습니다. 위에서 새 작업을 추가해보세요.
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="p-4 border rounded-md hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{task.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        User ID: {task.user_id}
                      </p>
                      {task.created_at && (
                        <p className="text-xs text-muted-foreground">
                          생성일: {new Date(task.created_at).toLocaleString("ko-KR")}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

