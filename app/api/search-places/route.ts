/**
 * @file app/api/search-places/route.ts
 * @description 네이버 클라우드 플랫폼 Local Search API를 사용한 장소 검색 API Route
 *
 * 주요 기능:
 * 1. 클라이언트에서 전달받은 검색어로 네이버 Local Search API 호출
 * 2. 장소명 검색 결과 반환
 *
 * @dependencies
 * - 네이버 클라우드 플랫폼 Local Search API
 * - NAVER_SEARCH_CLIENT_ID: 환경 변수 (검색 API용, 우선 사용)
 * - NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: 환경 변수 (지도 API용, 폴백)
 * - NAVER_CLIENT_SECRET: 환경 변수 (서버 사이드에서만 사용)
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "검색어가 필요합니다." },
        { status: 400 }
      );
    }

    // 검색 API용 Client ID 우선 사용, 없으면 지도 API용 Client ID 사용 (폴백)
    const clientId = process.env.NAVER_SEARCH_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("❌ 네이버 클라우드 플랫폼 인증 정보가 설정되지 않았습니다.", {
        hasSearchClientId: !!process.env.NAVER_SEARCH_CLIENT_ID,
        hasMapClientId: !!process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID,
        hasClientSecret: !!process.env.NAVER_CLIENT_SECRET,
      });
      return NextResponse.json(
        { error: "서버 설정 오류" },
        { status: 500 }
      );
    }

    // 네이버 Local Search API 호출
    const apiUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=10&sort=random`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    if (!response.ok) {
      console.error("❌ 네이버 Local Search API 호출 실패:", {
        status: response.status,
        statusText: response.statusText,
      });
      return NextResponse.json(
        { error: "장소 검색에 실패했습니다." },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 네이버 Local Search API 응답 형식 변환
    // 네이버 Local Search API는 주소만 반환하므로, 좌표는 클라이언트에서 Geocoding으로 변환
    const items = (data.items || []).map((item: any) => {
      return {
        title: item.title?.replace(/<[^>]*>/g, "") || "", // HTML 태그 제거
        address: item.address || "",
        roadAddress: item.roadAddress || item.address || "",
        category: item.category || "",
        // 좌표는 클라이언트에서 주소를 Geocoding으로 변환하여 사용
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("❌ 장소 검색 API 오류:", error);
    return NextResponse.json(
      { error: "장소 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

