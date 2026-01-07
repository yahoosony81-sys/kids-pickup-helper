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
