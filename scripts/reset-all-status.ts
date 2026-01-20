
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

async function resetAllStatus() {
    console.log("🔄 데이터 상태 초기화 시작 (Service Role Key 사용)...");

    // 1. Invitations 테이블 초기화 (모두 삭제)
    console.log("1️⃣ Invitations 테이블 정리 중...");
    const { error: invError, count: invCount } = await supabase
        .from("invitations")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // 전체 삭제

    if (invError) console.error("❌ Invitations 삭제 실패:", invError.message);
    else console.log(`✅ Invitations 테이블 비우기 완료`);

    // 2. Pickup Requests 상태 초기화
    // 'REQUESTED'가 아닌 상태(MATCHED, COMPLETED 등)를 'REQUESTED'로 되돌려야 다시 초대 가능
    // 단, CANCELLED나 EXPIRED는 건드리지 않는 것이 안전할 수 있으나, 
    // 사용자가 "모든 초대 대기 상태 초기화"를 원하므로, 
    // 진행 중이거나 완료된 것들을 다시 'REQUESTED'로 되돌려서 테스트 가능하게 만듦.
    console.log("2️⃣ Pickup Requests 상태 초기화 중...");

    // 변경 대상: MATCHED, IN_PROGRESS, ARRIVED, COMPLETED
    // (CANCELLED, EXPIRED는 유지)
    const targetStatuses = ["MATCHED", "IN_PROGRESS", "ARRIVED", "COMPLETED"];

    const { data: requestsToUpdate, error: fetchError } = await supabase
        .from("pickup_requests")
        .select("id, status")
        .in("status", targetStatuses);

    if (fetchError) {
        console.error("❌ Pickup Requests 조회 실패:", fetchError.message);
    } else if (requestsToUpdate && requestsToUpdate.length > 0) {
        console.log(`📋 초기화 대상 요청: ${requestsToUpdate.length}건`);

        const { error: updateError } = await supabase
            .from("pickup_requests")
            .update({ status: "REQUESTED" })
            .in("id", requestsToUpdate.map(r => r.id));

        if (updateError) console.error("❌ Pickup Requests 업데이트 실패:", updateError.message);
        else console.log("✅ Pickup Requests 상태를 'REQUESTED'로 초기화 완료");
    } else {
        console.log("ℹ️ 초기화할 Pickup Requests가 없습니다.");
    }

    // 3. Trip Participants 테이블 초기화 (참여자 목록 삭제)
    // 초대가 수락되어 참여자가 된 경우, 이를 삭제해야 다시 초대가 가능함
    console.log("3️⃣ Trip Participants 테이블 정리 중...");
    const { error: partError } = await supabase
        .from("trip_participants")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // 전체 삭제

    if (partError) console.error("❌ Trip Participants 삭제 실패:", partError.message);
    else console.log("✅ Trip Participants 테이블 비우기 완료");

    console.log("🎉 모든 데이터 상태 초기화 완료!");
}

resetAllStatus();
