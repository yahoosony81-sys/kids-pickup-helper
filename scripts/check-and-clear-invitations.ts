
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// .env.local 파일 로드
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ 환경 변수가 설정되지 않았습니다.");
    console.error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 .env.local에 있는지 확인해주세요.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function checkAndClearInvitations() {
    console.log("🔍 PENDING 상태의 초대 확인 중...");

    const { data: invitations, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("status", "PENDING");

    if (error) {
        console.error("❌ 초대 조회 실패:", error.message);
        return;
    }

    if (!invitations || invitations.length === 0) {
        console.log("✅ PENDING 상태의 초대가 없습니다.");
        return;
    }

    console.log(`📋 총 ${invitations.length}개의 PENDING 초대가 발견되었습니다.`);
    invitations.forEach((inv) => {
        console.log(` - ID: ${inv.id}, Request ID: ${inv.pickup_request_id}, Created: ${inv.created_at}`);
    });

    console.log("\n🗑️ PENDING 초대 삭제를 시도합니다...");

    const { error: deleteError } = await supabase
        .from("invitations")
        .delete()
        .eq("status", "PENDING");

    if (deleteError) {
        console.error("❌ 초대 삭제 실패:", deleteError.message);
    } else {
        console.log("✅ 모든 PENDING 초대가 성공적으로 삭제되었습니다.");
    }
}

checkAndClearInvitations();
