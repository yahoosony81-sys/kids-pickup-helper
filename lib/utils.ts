import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 날짜/시간을 한국어 형식으로 포맷팅하는 함수
 * 
 * 데이터베이스에 저장된 시간은 한국 시간 기준이므로 변환 없이 그대로 사용합니다.
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열 (예: "2024-01-01T17:30")
 * @returns "2024년 1월 1일 17:30" 형식의 한국어 날짜 문자열
 */
export function formatDateTime(dateString: string): string {
  // 데이터베이스에서 조회된 시간을 파싱 (한국 시간 기준)
  const date = new Date(dateString);
  
  // 로컬 시간 메서드를 사용하여 연/월/일/시/분 추출
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  
  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}

/**
 * 짧은 형식의 날짜/시간 포맷팅 함수
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열 (한국 시간 기준)
 * @param prefix - 접두사 (기본값: "등록:")
 * @returns "{prefix} 2024-1-1 17:30" 형식의 문자열
 */
export function formatDateTimeShort(dateString: string, prefix: string = "등록:"): string {
  // 데이터베이스에서 조회된 시간을 파싱 (한국 시간 기준)
  const date = new Date(dateString);
  
  // 로컬 시간 메서드를 사용하여 연/월/일/시/분 추출
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  
  return `${prefix} ${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 한국 시간대(Asia/Seoul) 기준으로 현재 날짜의 00:00:00을 반환
 * 
 * @returns 한국 시간 기준 오늘 00:00:00의 Date 객체 (UTC로 변환됨)
 */
export function getTodayStartInKST(): Date {
  const now = new Date();
  // Intl API를 사용하여 한국 시간대의 현재 날짜/시간 문자열 생성
  const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = kstFormatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0") - 1; // 0-based
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0");
  
  // 한국 시간대의 오늘 00:00:00을 UTC Date 객체로 생성
  // Date.UTC를 사용하여 UTC 시간으로 변환 (한국 시간 = UTC + 9시간)
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * 한국 시간대(Asia/Seoul) 기준으로 날짜가 과거인지 확인
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns scheduled_start_at이 오늘 00:00:00 이전이면 true (History), 아니면 false (Active)
 */
export function isPastDateInKST(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  
  const targetDate = new Date(dateString);
  const todayStart = getTodayStartInKST();
  
  return targetDate < todayStart;
}

/**
 * 한국 시간대(Asia/Seoul) 기준으로 날짜 문자열에서 YYYY-MM 형식의 월 문자열 추출
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns "YYYY-MM" 형식의 문자열 (예: "2026-01")
 */
export function getMonthStringFromDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * 한국 시간대(Asia/Seoul) 기준으로 날짜 문자열에서 YYYY-MM-DD 형식의 날짜 문자열 추출
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns "YYYY-MM-DD" 형식의 문자열 (예: "2026-01-10")
 */
export function getDateStringFromDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
