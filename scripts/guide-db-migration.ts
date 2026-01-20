
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

async function modifyIndexes() {
    console.log("🔍 DB 인덱스 수정 시작...");

    // 1. 기존 Unique Index 삭제 (요청자 PENDING 제한)
    // 인덱스 이름은 추정치이므로, 에러가 발생할 수 있음.
    // 보통 'invitations_requester_profile_id_status_idx' 같은 이름일 것임.
    // 여기서는 SQL을 직접 실행하여 인덱스를 찾고 삭제하는 방식을 사용해야 하지만,
    // Supabase JS 클라이언트로는 DDL(CREATE, DROP) 실행이 제한될 수 있음.
    // 따라서 rpc(Stored Procedure)를 사용하거나, 
    // 가장 확실한 방법은 '중복 데이터가 들어갈 수 있도록' 제약조건을 우회하는 것이 아니라
    // 제약조건 자체를 없애야 함.

    // 하지만 JS 클라이언트로는 인덱스 삭제가 불가능하므로,
    // 사용자가 직접 SQL Editor에서 실행할 수 있는 쿼리를 출력해주는 방식으로 지원.

    console.log(`
⚠️ [중요] DB 인덱스 수정이 필요합니다.
Supabase 대시보드의 SQL Editor에서 아래 쿼리를 실행해주세요:

-- 1. 기존 제약조건 확인 (이름 확인용)
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'invitations';

-- 2. 요청자 PENDING 제한 인덱스 삭제 (이름이 'invitations_requester_status_unique'라고 가정)
-- 실제 이름은 위 1번 쿼리로 확인 후 변경해야 합니다.
DROP INDEX IF EXISTS invitations_requester_status_unique;
DROP INDEX IF EXISTS unique_pending_invitation_per_requester;

-- 3. (선택) 대신 '같은 요청서(pickup_request_id)'에 대해서는 중복 초대를 막고 싶다면:
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_invitation_per_request 
ON invitations (pickup_request_id) 
WHERE status = 'PENDING';
`);

    console.log("✅ SQL 쿼리 안내 완료. 위 쿼리를 복사하여 Supabase SQL Editor에서 실행해주세요.");
}

modifyIndexes();
