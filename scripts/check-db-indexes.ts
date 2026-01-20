
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

async function checkIndexes() {
    console.log("🔍 Invitations 테이블의 인덱스 정보를 조회합니다...");

    // pg_indexes 뷰를 조회하여 인덱스 정보 확인
    // Supabase JS 클라이언트의 rpc를 사용하거나, 직접 쿼리를 실행할 수 없으므로
    // 사용자가 SQL Editor에서 실행해야 할 쿼리를 출력합니다.

    console.log(`
⚠️ [확인 필요] 정확한 인덱스 이름을 알기 위해 아래 쿼리를 Supabase SQL Editor에서 실행한 후, 결과를 알려주세요.

SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'invitations';
`);

    // 혹시 모르니 rpc 호출 시도 (만약 get_indexes 같은 함수가 있다면)
    // 하지만 기본적으로는 없으므로 패스.

    console.log("✅ 위 쿼리 결과를 복사해서 알려주시면, 정확한 삭제 명령어를 다시 알려드리겠습니다.");
}

checkIndexes();
