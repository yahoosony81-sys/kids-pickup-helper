import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 날짜/시간을 한국어 형식으로 포맷팅하는 함수
 * 
 * 데이터베이스에 저장된 시간은 UTC로 저장되어 있으므로, 한국 시간대(Asia/Seoul)로 변환하여 표시합니다.
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열 (UTC 기준)
 * @returns "2024년 1월 1일 17:30" 형식의 한국어 날짜 문자열 (KST)
 */
export function formatDateTime(dateString: string): string {
  // UTC로 저장된 시간을 파싱
  const date = new Date(dateString);
  
  // Intl API를 사용하여 한국 시간대(Asia/Seoul)로 변환
  const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  const parts = kstFormatter.formatToParts(date);
  const year = parts.find(p => p.type === "year")?.value || "";
  const month = parts.find(p => p.type === "month")?.value || "";
  const day = parts.find(p => p.type === "day")?.value || "";
  const hour = parts.find(p => p.type === "hour")?.value || "";
  const minute = parts.find(p => p.type === "minute")?.value || "";
  
  return `${year}년 ${month}월 ${day}일 ${hour}:${minute}`;
}

/**
 * 짧은 형식의 날짜/시간 포맷팅 함수
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열 (UTC 기준)
 * @param prefix - 접두사 (기본값: "등록:")
 * @returns "{prefix} 2024-1-1 17:30" 형식의 문자열 (KST)
 */
export function formatDateTimeShort(dateString: string, prefix: string = "등록:"): string {
  // UTC로 저장된 시간을 파싱
  const date = new Date(dateString);
  
  // Intl API를 사용하여 한국 시간대(Asia/Seoul)로 변환
  const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  const parts = kstFormatter.formatToParts(date);
  const year = parts.find(p => p.type === "year")?.value || "";
  const month = parts.find(p => p.type === "month")?.value || "";
  const day = parts.find(p => p.type === "day")?.value || "";
  const hour = parts.find(p => p.type === "hour")?.value || "";
  const minute = parts.find(p => p.type === "minute")?.value || "";
  
  return `${prefix} ${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 한국 시간대(Asia/Seoul) 기준으로 현재 시간을 반환
 * 
 * 중요: 모든 시간 비교는 UTC 기준으로 해야 합니다.
 * DB에 저장된 시간도 UTC이므로, new Date()를 그대로 사용하면 됩니다.
 * 
 * @returns 현재 시간의 Date 객체 (UTC 기준, 내부적으로 milliseconds로 저장)
 */
export function getCurrentTimeInKST(): Date {
  // new Date()는 항상 UTC milliseconds를 반환하므로 그대로 사용
  // DB의 timestamptz도 UTC로 저장되므로, 비교 시 동일한 기준을 사용
  return new Date();
}

/**
 * 한국 시간대(Asia/Seoul) 기준으로 현재 날짜의 00:00:00을 반환
 * 
 * 한국 시간 오늘 00:00:00을 UTC로 변환하여 반환합니다.
 * 예: 한국 시간 2026-01-14 00:00:00 = UTC 2026-01-13 15:00:00
 * 
 * @returns 한국 시간 기준 오늘 00:00:00의 Date 객체 (UTC로 변환됨)
 */
export function getTodayStartInKST(): Date {
  const now = new Date();
  
  // Intl API를 사용하여 한국 시간대의 현재 날짜를 가져옴
  const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = kstFormatter.formatToParts(now);
  const year = parts.find(p => p.type === "year")?.value || "";
  const month = parts.find(p => p.type === "month")?.value || "";
  const day = parts.find(p => p.type === "day")?.value || "";
  
  // 한국 시간대의 오늘 00:00:00을 ISO 8601 형식으로 생성 (+09:00 timezone)
  // 이렇게 하면 JavaScript가 자동으로 UTC로 변환
  const kstMidnight = new Date(`${year}-${month}-${day}T00:00:00+09:00`);
  
  return kstMidnight;
}

/**
 * 한국 시간대(Asia/Seoul) 기준으로 날짜가 과거인지 확인
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열 (UTC 기준)
 * @returns scheduled_start_at이 오늘 00:00:00 (KST) 이전이면 true (History), 아니면 false (Active)
 */
export function isPastDateInKST(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  
  // UTC로 저장된 날짜를 파싱
  const targetDate = new Date(dateString);
  // 한국 시간 기준 오늘 00:00:00 (UTC로 변환된 값)
  const todayStart = getTodayStartInKST();
  
  // UTC 기준으로 비교 (둘 다 UTC milliseconds이므로 정확히 비교 가능)
  return targetDate < todayStart;
}

/**
 * 한국 시간대(Asia/Seoul) 기준으로 날짜 문자열에서 YYYY-MM 형식의 월 문자열 추출
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열 (UTC 기준)
 * @returns "YYYY-MM" 형식의 문자열 (예: "2026-01") - 한국 시간 기준
 */
export function getMonthStringFromDate(dateString: string): string {
  const date = new Date(dateString);
  
  // Intl API를 사용하여 한국 시간대 기준으로 연/월 추출
  const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  });
  
  const parts = kstFormatter.formatToParts(date);
  const year = parts.find(p => p.type === "year")?.value || "";
  const month = parts.find(p => p.type === "month")?.value || "";
  
  return `${year}-${month}`;
}

/**
 * 한국 시간대(Asia/Seoul) 기준으로 날짜 문자열에서 YYYY-MM-DD 형식의 날짜 문자열 추출
 * 
 * @param dateString - ISO 8601 형식의 날짜 문자열 (UTC 기준)
 * @returns "YYYY-MM-DD" 형식의 문자열 (예: "2026-01-10") - 한국 시간 기준
 */
export function getDateStringFromDate(dateString: string): string {
  const date = new Date(dateString);
  
  // Intl API를 사용하여 한국 시간대 기준으로 연/월/일 추출
  const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = kstFormatter.formatToParts(date);
  const year = parts.find(p => p.type === "year")?.value || "";
  const month = parts.find(p => p.type === "month")?.value || "";
  const day = parts.find(p => p.type === "day")?.value || "";
  
  return `${year}-${month}-${day}`;
}
