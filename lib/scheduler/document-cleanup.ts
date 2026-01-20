import { createClient } from "@supabase/supabase-js";

/**
 * 승인된 지 30일이 지난 서류를 삭제하는 스케줄러 함수 (뼈대)
 * 
 * 실제 운영 환경에서는:
 * 1. Supabase pg_cron을 사용하거나
 * 2. Vercel Cron Jobs를 사용하여 이 API 라우트를 주기적으로 호출해야 합니다.
 * 
 * 현재 구현:
 * - 로직만 구현되어 있으며, 실제 삭제는 주석 처리됨 (안전장치)
 * - 실행 시 로그만 출력
 */
export async function cleanupOldDocuments() {
    console.log("🧹 [Cleanup] 오래된 서류 삭제 작업 시작");

    // Service Role Key 필요 (모든 데이터 접근 및 삭제 권한)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 30일 전 날짜 계산
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        // 1. 삭제 대상 조회 (승인되었고, 업데이트된 지 30일 지난 서류)
        // status = 'APPROVED' AND updated_at < thirtyDaysAgo
        const { data: documents, error: fetchError } = await supabase
            .from("provider_documents")
            .select("id, file_path, updated_at")
            .eq("status", "APPROVED")
            .lt("updated_at", thirtyDaysAgo.toISOString());

        if (fetchError) {
            console.error("❌ 삭제 대상 조회 실패:", fetchError);
            return { success: false, error: fetchError.message };
        }

        if (!documents || documents.length === 0) {
            console.log("✅ 삭제할 오래된 서류가 없습니다.");
            return { success: true, count: 0 };
        }

        console.log(`🔍 삭제 대상 서류 발견: ${documents.length}건`);

        // 2. 실제 삭제 로직 (뼈대)
        let deletedCount = 0;
        for (const doc of documents) {
            console.log(`🗑️ [Dry Run] 서류 삭제 예정: ID=${doc.id}, Path=${doc.file_path}, Date=${doc.updated_at}`);

            // TODO: 실제 스토리지 파일 삭제
            // const { error: storageError } = await supabase.storage.from('documents').remove([doc.file_path]);

            // TODO: DB 레코드 삭제
            // const { error: dbError } = await supabase.from('provider_documents').delete().eq('id', doc.id);

            deletedCount++;
        }

        return { success: true, count: deletedCount };

    } catch (error) {
        console.error("❌ Cleanup 작업 중 오류 발생:", error);
        return { success: false, error: "Unknown error" };
    }
}
