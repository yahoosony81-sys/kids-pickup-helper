/**
 * @file lib/utils/pickup-group.ts
 * @description 픽업 그룹 관련 유틸리티 함수
 */

/**
 * 그룹명 자동 생성
 * 
 * 출발 예정 시각을 기반으로 그룹명을 자동 생성합니다.
 * 예: "1월 7일 15시 픽업 그룹"
 * 
 * @param scheduledStartAt - 출발 예정 시각 (ISO 문자열 또는 Date 객체)
 * @returns 생성된 그룹명
 */
export function generateGroupTitle(scheduledStartAt: string | Date): string {
  // datetime-local 형식("YYYY-MM-DDTHH:mm")을 로컬 시간대로 올바르게 파싱
  let date: Date;
  if (typeof scheduledStartAt === "string") {
    // datetime-local 형식은 타임존 정보가 없으므로 로컬 시간대로 해석
    // "2025-01-07T15:00" 형식을 파싱
    if (scheduledStartAt.includes("T") && !scheduledStartAt.includes("Z") && !scheduledStartAt.includes("+")) {
      // 로컬 시간대로 해석
      const [datePart, timePart] = scheduledStartAt.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = timePart.split(":").map(Number);
      date = new Date(year, month - 1, day, hour, minute);
    } else {
      date = new Date(scheduledStartAt);
    }
  } else {
    date = scheduledStartAt;
  }
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  return `${month}월 ${day}일 ${hour}시 픽업 그룹`;
}

