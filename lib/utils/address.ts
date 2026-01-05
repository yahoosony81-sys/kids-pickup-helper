/**
 * @file lib/utils/address.ts
 * @description 주소 파싱 유틸리티 함수
 *
 * 주요 기능:
 * 1. 한국 주소에서 구/동 추출
 * 2. 목적지 유형 판단 (학원, 학교, 집 등)
 *
 * 핵심 구현 로직:
 * - 정규식을 사용한 주소 파싱
 * - 키워드 기반 목적지 유형 판단
 * - 안전 처리: 파싱 실패 시 전체 주소 반환
 *
 * @dependencies
 * - 없음 (순수 함수)
 */

/**
 * 한국 주소에서 구/동 추출
 * 
 * 예시:
 * - "서울특별시 강남구 역삼동 123" → "강남구 역삼동"
 * - "경기도 성남시 분당구 정자동" → "분당구 정자동"
 * - "부산광역시 해운대구 우동" → "해운대구 우동"
 * 
 * @param address 전체 주소 문자열
 * @returns 구/동 정보 (파싱 실패 시 전체 주소 반환)
 */
export function extractAreaFromAddress(address: string): string {
  if (!address || typeof address !== "string") {
    return address || "";
  }

  // 한국 주소 형식: 시/도 + 구/군 + 동/읍/면
  // 예: "서울특별시 강남구 역삼동", "경기도 성남시 분당구 정자동"
  
  // 시/도 제거 후 구/군 + 동/읍/면 추출
  // 패턴: (시/도) (구/군) (동/읍/면)
  const patterns = [
    // 특별시/광역시: "서울특별시 강남구 역삼동"
    /(?:서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시)\s+([가-힣]+구|[가-힣]+군)\s+([가-힣]+동|[가-힣]+읍|[가-힣]+면)/,
    // 도: "경기도 성남시 분당구 정자동"
    /(?:경기|강원|충북|충남|전북|전남|경북|경남|제주)도\s+[가-힣]+시\s+([가-힣]+구|[가-힣]+군)\s+([가-힣]+동|[가-힣]+읍|[가-힣]+면)/,
    // 시 단위: "경기도 성남시 분당구" (시가 구를 포함하는 경우)
    /(?:경기|강원|충북|충남|전북|전남|경북|경남|제주)도\s+[가-힣]+시\s+([가-힣]+구|[가-힣]+군)/,
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      // 구/군과 동/읍/면이 모두 있는 경우
      if (match[2]) {
        return `${match[1]} ${match[2]}`;
      }
      // 구/군만 있는 경우
      if (match[1]) {
        return match[1];
      }
    }
  }

  // 파싱 실패 시 전체 주소 반환 (안전 처리)
  return address;
}

/**
 * 목적지 텍스트에서 유형 판단
 * 
 * 키워드 기반으로 목적지 유형을 판단합니다:
 * - "학원" → "학원"
 * - "학교", "초등학교", "중학교", "고등학교" → "학교"
 * - "집", "자택", "주거지" → "집"
 * - 그 외 → "기타"
 * 
 * @param destinationText 목적지 주소 또는 설명 텍스트
 * @returns 목적지 유형 ("학원", "학교", "집", "기타")
 */
export function detectDestinationType(destinationText: string): string {
  if (!destinationText || typeof destinationText !== "string") {
    return "기타";
  }

  const normalizedText = destinationText.toLowerCase();

  // 학원 키워드
  if (
    normalizedText.includes("학원") ||
    normalizedText.includes("academy") ||
    normalizedText.includes("아카데미")
  ) {
    return "학원";
  }

  // 학교 키워드
  if (
    normalizedText.includes("학교") ||
    normalizedText.includes("초등학교") ||
    normalizedText.includes("중학교") ||
    normalizedText.includes("고등학교") ||
    normalizedText.includes("school") ||
    normalizedText.includes("elementary") ||
    normalizedText.includes("middle") ||
    normalizedText.includes("high")
  ) {
    return "학교";
  }

  // 집 키워드
  if (
    normalizedText.includes("집") ||
    normalizedText.includes("자택") ||
    normalizedText.includes("주거지") ||
    normalizedText.includes("home") ||
    normalizedText.includes("residence")
  ) {
    return "집";
  }

  // 기본값
  return "기타";
}

