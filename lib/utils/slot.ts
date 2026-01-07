/**
 * @file lib/utils/slot.ts
 * @description Time Slot 관련 유틸리티 함수
 *
 * 주요 기능:
 * 1. pickup_time에서 slot_key 추출
 * 2. 같은 시간대(slot)를 기준으로 초대 마감 처리
 *
 * 핵심 구현 로직:
 * - pickup_time을 YYYY-MM-DD-HH 형식으로 변환
 * - 예: 2026-01-07 15:30:00 → "2026-01-07-15"
 *
 * @dependencies
 * - 없음 (순수 유틸리티 함수)
 */

/**
 * pickup_time에서 slot_key를 추출합니다.
 * 
 * slot_key 형식: YYYY-MM-DD-HH
 * 예: 2026-01-07 15:30:00 → "2026-01-07-15"
 * 
 * @param pickupTime - 픽업 시간 (Date 객체 또는 ISO 문자열)
 * @returns slot_key 문자열 (YYYY-MM-DD-HH 형식)
 */
export function getSlotKey(pickupTime: Date | string): string {
  const date = typeof pickupTime === 'string' ? new Date(pickupTime) : pickupTime;
  
  // 한국 시간 기준으로 변환 (pickup_time은 한국 시간 기준 timestamp)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hour}`;
}

