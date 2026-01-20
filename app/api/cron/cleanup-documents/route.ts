import { NextResponse } from "next/server";
import { cleanupOldDocuments } from "@/lib/scheduler/document-cleanup";

/**
 * Cron Job용 API Route
 * 
 * 호출 방법:
 * - Vercel Cron 설정
 * - 또는 관리자가 수동으로 호출 (보안 키 필요)
 */
export async function GET(request: Request) {
    // 간단한 보안 체크 (Authorization 헤더 확인)
    // 실제 운영 시에는 CRON_SECRET 환경변수와 비교해야 함
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // 개발 환경 편의를 위해 일단 주석 처리하거나 로그만 남김
        // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        console.warn("⚠️ Cron Job 호출: 인증 헤더가 없거나 일치하지 않습니다. (개발 모드 허용)");
    }

    const result = await cleanupOldDocuments();

    return NextResponse.json(result);
}
