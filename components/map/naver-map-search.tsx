/**
 * @file components/map/naver-map-search.tsx
 * @description 네이버 지도 API를 활용한 주소 검색 및 위치 선택 컴포넌트
 *
 * 주요 기능:
 * 1. 주소 검색 (네이버 지도 Geocoding API)
 * 2. 지도에서 위치 선택
 * 3. 선택한 위치의 좌표(lat, lng) 및 주소 텍스트 반환
 *
 * 핵심 구현 로직:
 * - 네이버 지도 API 스크립트 동적 로드
 * - 주소 검색 후 지도에 마커 표시
 * - 지도 클릭 시 위치 선택 및 좌표 반환
 * - 선택한 위치 정보를 부모 컴포넌트에 전달
 *
 * @dependencies
 * - 네이버 지도 API: 클라이언트 사이드에서만 동작
 * - NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: 환경 변수
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";

declare global {
  interface Window {
    naver: any;
  }
}

interface NaverMapSearchProps {
  label: string;
  value: {
    text: string;
    lat: number;
    lng: number;
  } | null;
  onChange: (value: { text: string; lat: number; lng: number }) => void;
  error?: string;
}

export function NaverMapSearch({
  label,
  value,
  onChange,
  error,
}: NaverMapSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // 네이버 지도 API 스크립트 로드
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) {
      console.error("NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다.");
      return;
    }

    // 이미 로드되어 있는지 확인
    if (window.naver && window.naver.maps) {
      setIsMapLoaded(true);
      return;
    }

    // 스크립트 동적 로드
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`;
    script.async = true;
    script.onload = () => {
      setIsMapLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // 정리 작업은 생략 (전역 스크립트이므로)
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.naver) return;

    const defaultCenter = value
      ? new window.naver.maps.LatLng(value.lat, value.lng)
      : new window.naver.maps.LatLng(37.5665, 126.978); // 서울시청 기본 위치

    const map = new window.naver.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 15,
    });

    mapInstanceRef.current = map;

    // 기존 값이 있으면 마커 표시
    if (value) {
      const marker = new window.naver.maps.Marker({
        position: defaultCenter,
        map: map,
      });
      markerRef.current = marker;
    }

    // 지도 클릭 이벤트: 위치 선택
    window.naver.maps.Event.addListener(map, "click", (e: any) => {
      const lat = e.coord.lat();
      const lng = e.coord.lng();

      // 역지오코딩: 좌표 → 주소
      window.naver.maps.Service.reverseGeocode(
        {
          coords: new window.naver.maps.LatLng(lat, lng),
        },
        (status: any, response: any) => {
          if (status === window.naver.maps.Service.Status.ERROR) {
            console.error("역지오코딩 실패");
            return;
          }

          const address =
            response.v2.address.roadAddress ||
            response.v2.address.jibunAddress ||
            `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

          // 마커 업데이트
          if (markerRef.current) {
            markerRef.current.setPosition(new window.naver.maps.LatLng(lat, lng));
          } else {
            markerRef.current = new window.naver.maps.Marker({
              position: new window.naver.maps.LatLng(lat, lng),
              map: map,
            });
          }

          onChange({ text: address, lat, lng });
        }
      );
    });
  }, [isMapLoaded, onChange]);

  // 주소 검색
  const handleSearch = async () => {
    if (!searchQuery.trim() || !window.naver) return;

    setIsSearching(true);

    try {
      window.naver.maps.Service.geocode(
        {
          query: searchQuery,
        },
        (status: any, response: any) => {
          setIsSearching(false);

          if (status === window.naver.maps.Service.Status.ERROR) {
            alert("주소 검색에 실패했습니다. 다시 시도해주세요.");
            return;
          }

          if (response.v2.addresses.length === 0) {
            alert("검색 결과가 없습니다.");
            return;
          }

          const address = response.v2.addresses[0];
          const lat = parseFloat(address.y);
          const lng = parseFloat(address.x);
          const addressText =
            address.roadAddress || address.jibunAddress || searchQuery;

          // 지도 중심 이동
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(
              new window.naver.maps.LatLng(lat, lng)
            );
            mapInstanceRef.current.setZoom(17);

            // 마커 업데이트
            if (markerRef.current) {
              markerRef.current.setPosition(
                new window.naver.maps.LatLng(lat, lng)
              );
            } else {
              markerRef.current = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(lat, lng),
                map: mapInstanceRef.current,
              });
            }
          }

          onChange({ text: addressText, lat, lng });
        }
      );
    } catch (error) {
      console.error("주소 검색 에러:", error);
      setIsSearching(false);
      alert("주소 검색 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {/* 주소 검색 입력 */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="주소를 검색하세요"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          disabled={!isMapLoaded}
        />
        <Button
          type="button"
          onClick={handleSearch}
          disabled={!isMapLoaded || isSearching}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* 지도 */}
      <div
        ref={mapRef}
        className="w-full h-64 rounded-md border overflow-hidden"
        style={{ minHeight: "256px" }}
      />

      {/* 선택한 위치 표시 */}
      {value && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{value.text}</span>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 지도 로드 안내 */}
      {!isMapLoaded && (
        <p className="text-sm text-muted-foreground">
          지도를 불러오는 중...
        </p>
      )}
    </div>
  );
}

