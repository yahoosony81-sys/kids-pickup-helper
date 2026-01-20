
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

async function clearAllInvitations() {
    console.log("🧹 Invitations 테이블 전체 삭제 중...");

    // 모든 데이터 삭제 (조건 없이)
    const { error, count } = await supabase
        .from("invitations")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // 모든 ID 대상 (사실상 전체 삭제)

    if (error) {
        console.error("❌ 삭제 실패:", error.message);
    } else {
        console.log(`✅ Invitations 테이블이 깨끗하게 비워졌습니다.`);
    }
}

clearAllInvitations();
