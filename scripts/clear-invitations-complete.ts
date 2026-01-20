
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// .env.local 파일 로드
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ 환경 변수가 설정되지 않았습니다.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function clearInvitations() {
    console.log("🔍 Invitations 테이블 상태 분석 중...");

    // 1. 전체 상태 분포 확인
    const { data: allInvitations, error: countError } = await supabase
        .from("invitations")
        .select("status");

    if (countError) {
        console.error("❌ 조회 실패:", countError.message);
        return;
    }

    const statusCounts = allInvitations.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log("📊 현재 초대 상태 분포:", statusCounts);

    // 2. 'REQUESTED' 상태 삭제 (사용자 요청)
    // 참고: 정상 로직상 invitations에는 REQUESTED가 없어야 함. pickup_requests에만 존재.
    // 하지만 사용자가 요청했으므로 확인 및 삭제 시도.
    if (statusCounts["REQUESTED"] > 0 || statusCounts["requested"] > 0) {
        console.log("🧹 'REQUESTED' 상태의 초대 데이터 삭제 중...");
        const { error: deleteRequestedError } = await supabase
            .from("invitations")
            .delete()
            .in("status", ["REQUESTED", "requested"]);

        if (deleteRequestedError) console.error("❌ 삭제 실패:", deleteRequestedError.message);
        else console.log("✅ 'REQUESTED' 상태 데이터 삭제 완료");
    } else {
        console.log("ℹ️ 'REQUESTED' 상태의 초대 데이터는 없습니다.");
    }

    // 3. 'PENDING' 상태 삭제 (테스트 초기화 목적)
    if (statusCounts["PENDING"] > 0) {
        console.log("🧹 'PENDING' 상태의 초대 데이터 삭제 중...");
        const { error: deletePendingError } = await supabase
            .from("invitations")
            .delete()
            .eq("status", "PENDING");

        if (deletePendingError) console.error("❌ 삭제 실패:", deletePendingError.message);
        else console.log("✅ 'PENDING' 상태 데이터 삭제 완료");
    } else {
        console.log("ℹ️ 'PENDING' 상태의 초대 데이터는 없습니다.");
    }

    // 4. 최종 확인
    const { data: finalCheck } = await supabase.from("invitations").select("status");
    console.log("🏁 최종 데이터 상태:", finalCheck?.length === 0 ? "데이터 없음 (깨끗함)" : finalCheck?.map(i => i.status));
}

clearInvitations();
