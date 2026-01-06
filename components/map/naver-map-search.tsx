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
import { Search, MapPin, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

interface SearchResult {
  roadAddress: string;
  jibunAddress: string;
  x: string;
  y: string;
  title?: string; // 장소명 (Places API 결과)
  category?: string; // 카테고리 (Places API 결과)
}

export function NaverMapSearch({
  label,
  value,
  onChange,
  error,
}: NaverMapSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // 네이버 지도 API 스크립트 로드
  useEffect(() => {
    console.group("🗺️ [네이버 지도] 스크립트 로드 시작");
    
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    console.log("1️⃣ 환경 변수 확인:", {
      hasClientId: !!clientId,
      clientIdLength: clientId?.length || 0,
      clientIdPrefix: clientId ? `${clientId.substring(0, 4)}...` : "없음",
    });

    if (!clientId) {
      console.error("❌ NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다.");
      console.error("💡 해결 방법: .env 파일에 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID를 추가하세요.");
      console.groupEnd();
      return;
    }

    // 이미 로드되어 있는지 확인 (Service까지 확인)
    console.log("2️⃣ 기존 스크립트 확인:", {
      hasNaver: !!window.naver,
      hasMaps: !!window.naver?.maps,
      hasService: !!window.naver?.maps?.Service,
      hasGeocode: typeof window.naver?.maps?.Service?.geocode === "function",
      hasReverseGeocode: typeof window.naver?.maps?.Service?.reverseGeocode === "function",
    });

    if (window.naver?.maps?.Service) {
      console.log("✅ 네이버 지도 API가 이미 로드되어 있습니다.");
      setIsMapLoaded(true);
      console.groupEnd();
      return;
    }

    // 스크립트 동적 로드 (geocoder와 places 서브모듈 포함)
    const scriptUrl = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder,places`;
    console.log("3️⃣ 스크립트 URL 생성:", {
      url: scriptUrl,
      hasClientId: scriptUrl.includes(clientId),
      hasGeocoder: scriptUrl.includes("geocoder"),
    });

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    
    script.onload = () => {
      console.log("4️⃣ 스크립트 로드 완료 (onload 이벤트 발생)");
      console.log("   스크립트가 DOM에 추가되었지만, API 초기화는 아직 진행 중일 수 있습니다.");
      
      let isLoaded = false;
      let checkCount = 0;
      const maxChecks = 100; // 최대 10초 (100ms * 100)

      // 네이버 지도 API가 완전히 초기화될 때까지 대기
      const checkService = () => {
        if (isLoaded) return;

        checkCount++;
        
        if (checkCount % 10 === 0) {
          console.log(`   🔄 Service 모듈 확인 중... (${checkCount}/${maxChecks})`);
        }
        
        // Service 모듈이 로드되었는지 확인
        if (window.naver?.maps?.Service) {
          console.log("5️⃣ Service 모듈 발견!");
          console.log("   Service 객체 확인:", {
            hasService: !!window.naver.maps.Service,
            hasGeocode: typeof window.naver.maps.Service.geocode === "function",
            hasReverseGeocode: typeof window.naver.maps.Service.reverseGeocode === "function",
            hasStatus: !!window.naver.maps.Service.Status,
          });
          
          // Service.geocode 메서드가 실제로 사용 가능한지 확인
          if (typeof window.naver.maps.Service.geocode === "function") {
            console.log("✅ Service.geocode 메서드 사용 가능!");
            console.log("✅ Service.reverseGeocode 메서드 사용 가능:", 
              typeof window.naver.maps.Service.reverseGeocode === "function");
            isLoaded = true;
            setIsMapLoaded(true);
            console.log("✅ 네이버 지도 API 초기화 완료!");
            console.groupEnd();
            return;
          } else {
            console.warn("⚠️ Service 객체는 있지만 geocode 메서드가 없습니다.");
          }
        }

        // onJSContentLoaded 이벤트가 있으면 사용 (한 번만)
        if (checkCount === 1 && window.naver?.maps?.onJSContentLoaded) {
          console.log("6️⃣ onJSContentLoaded 이벤트 리스너 등록");
          window.naver.maps.onJSContentLoaded(() => {
            console.log("   onJSContentLoaded 콜백 실행");
            if (window.naver?.maps?.Service && typeof window.naver.maps.Service.geocode === "function") {
              console.log("✅ onJSContentLoaded에서 Service 모듈 확인 완료!");
              isLoaded = true;
              setIsMapLoaded(true);
              console.groupEnd();
            } else {
              console.error("❌ onJSContentLoaded에서도 Service 모듈을 찾을 수 없습니다.");
              console.error("디버깅 정보:", {
                naver: !!window.naver,
                maps: !!window.naver?.maps,
                Service: !!window.naver?.maps?.Service,
                geocode: typeof window.naver?.maps?.Service?.geocode,
                reverseGeocode: typeof window.naver?.maps?.Service?.reverseGeocode,
              });
              console.error("💡 가능한 원인:");
              console.error("   1. 네이버 클라우드 플랫폼 콘솔에서 Dynamic Map API가 활성화되지 않음");
              console.error("   2. Geocoding API가 활성화되지 않음");
              console.error("   3. Reverse Geocoding API가 활성화되지 않음");
              console.error("   4. Web 서비스 URL이 등록되지 않음 (localhost:3000)");
              console.error("   5. Client ID가 올바르지 않음");
              console.groupEnd();
            }
          });
        }

        // 최대 체크 횟수 초과 시 타임아웃
        if (checkCount >= maxChecks) {
          if (!isLoaded) {
            console.error("❌ 네이버 지도 Service 모듈 로드 실패 (타임아웃)");
            console.error("   최대 대기 시간(10초)을 초과했습니다.");
            console.error("디버깅 정보:", {
              naver: !!window.naver,
              maps: !!window.naver?.maps,
              Service: !!window.naver?.maps?.Service,
              geocode: typeof window.naver?.maps?.Service?.geocode,
              reverseGeocode: typeof window.naver?.maps?.Service?.reverseGeocode,
              onJSContentLoaded: typeof window.naver?.maps?.onJSContentLoaded,
              checkCount,
            });
            console.error("💡 가능한 원인:");
            console.error("   1. 네이버 클라우드 플랫폼 콘솔에서 Dynamic Map API가 활성화되지 않음");
            console.error("   2. Geocoding API가 활성화되지 않음");
            console.error("   3. Reverse Geocoding API가 활성화되지 않음");
            console.error("   4. Web 서비스 URL이 등록되지 않음 (http://localhost:3000)");
            console.error("   5. Client ID가 올바르지 않거나 권한이 없음");
            console.error("   6. 네트워크 문제로 스크립트가 완전히 로드되지 않음");
            console.groupEnd();
          }
          return;
        }

        // 폴백: 주기적으로 확인
        setTimeout(checkService, 100);
      };

      // 약간의 지연 후 확인 (스크립트 초기화 시간 확보)
      console.log("   초기화 대기 시작 (200ms 후 첫 확인)");
      setTimeout(checkService, 200);
    };
    
    script.onerror = (error) => {
      console.error("❌ 네이버 지도 API 스크립트 로드 실패");
      console.error("에러 상세:", error);
      console.error("스크립트 URL:", scriptUrl);
      console.error("💡 가능한 원인:");
      console.error("   1. 네트워크 연결 문제");
      console.error("   2. Client ID가 올바르지 않음");
      console.error("   3. 네이버 클라우드 플랫폼 서비스 장애");
      console.error("   4. CORS 정책 문제 (브라우저 콘솔의 Network 탭 확인)");
      setMapError("네이버 지도 API를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.");
      console.groupEnd();
    };
    
    // 네이버 지도 API 인증 오류 감지 (401 오류)
    const checkAuthError = () => {
      // 스크립트 로드 후 일정 시간이 지나도 지도가 로드되지 않으면 인증 오류로 간주
      setTimeout(() => {
        if (!isMapLoaded && !mapError) {
          // window.naver가 없거나 maps가 없으면 인증 실패 가능성
          if (!window.naver?.maps) {
            setMapError("네이버 지도 API 인증에 실패했습니다. 도메인이 등록되어 있는지 확인해주세요.");
            console.error("❌ 네이버 지도 API 인증 실패 (401 오류 가능성)");
            console.error("💡 해결 방법:");
            console.error("   1. 네이버 클라우드 플랫폼 콘솔 접속: https://console.ncloud.com/");
            console.error("   2. AI·NAVER API → Application 등록");
            console.error("   3. Client ID '0ru9rtokfs' 선택");
            console.error("   4. Web 서비스 URL에 'https://kids-pickup-helper.vercel.app' 추가");
            console.error("   5. 저장 후 Vercel 재배포");
          }
        }
      }, 5000); // 5초 후 확인
    };
    
    checkAuthError();
    
    console.log("   스크립트를 DOM에 추가합니다...");
    document.head.appendChild(script);
    console.log("   ✅ 스크립트 DOM 추가 완료");

    return () => {
      // 정리 작업은 생략 (전역 스크립트이므로)
      console.log("🧹 컴포넌트 언마운트 (스크립트는 유지)");
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    console.group("🗺️ [네이버 지도] 지도 초기화 시작");
    
    if (!isMapLoaded) {
      console.warn("⚠️ 지도가 아직 로드되지 않았습니다. (isMapLoaded: false)");
      console.groupEnd();
      return;
    }

    if (!mapRef.current) {
      console.error("❌ 지도 컨테이너 요소를 찾을 수 없습니다.");
      console.groupEnd();
      return;
    }

    if (!window.naver?.maps) {
      console.error("❌ window.naver.maps가 없습니다.");
      console.error("디버깅 정보:", {
        hasNaver: !!window.naver,
        hasMaps: !!window.naver?.maps,
      });
      console.groupEnd();
      return;
    }

    console.log("1️⃣ 지도 초기화 조건 확인 완료:", {
      isMapLoaded,
      hasMapRef: !!mapRef.current,
      hasNaverMaps: !!window.naver.maps,
      mapRefDimensions: mapRef.current ? {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
      } : null,
    });

    const defaultCenter = value
      ? new window.naver.maps.LatLng(value.lat, value.lng)
      : new window.naver.maps.LatLng(37.5665, 126.978); // 서울시청 기본 위치

    console.log("2️⃣ 지도 중심 좌표 설정:", {
      hasValue: !!value,
      center: {
        lat: defaultCenter.lat(),
        lng: defaultCenter.lng(),
      },
      zoom: 15,
    });

    try {
      console.log("3️⃣ 지도 객체 생성 시도...");
      const map = new window.naver.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
      });
      
      console.log("✅ 지도 객체 생성 성공!");
      console.log("   지도 정보:", {
        center: {
          lat: map.getCenter().lat(),
          lng: map.getCenter().lng(),
        },
        zoom: map.getZoom(),
        bounds: map.getBounds(),
      });

      mapInstanceRef.current = map;

      // 기존 값이 있으면 마커 표시
      if (value) {
        console.log("4️⃣ 기존 값으로 마커 생성:", {
          text: value.text,
          lat: value.lat,
          lng: value.lng,
        });
        try {
          const marker = new window.naver.maps.Marker({
            position: defaultCenter,
            map: map,
          });
          markerRef.current = marker;
          console.log("✅ 마커 생성 성공");
        } catch (error) {
          console.error("❌ 마커 생성 실패:", error);
        }
      }

      // 지도 클릭 이벤트: 위치 선택
      console.log("5️⃣ 지도 클릭 이벤트 리스너 등록");
      window.naver.maps.Event.addListener(map, "click", (e: any) => {
        const lat = e.coord.lat();
        const lng = e.coord.lng();
        
        console.group("🗺️ [네이버 지도] 지도 클릭 이벤트");
        console.log("1️⃣ 클릭 좌표:", { lat, lng });

        // 역지오코딩: 좌표 → 주소
        console.log("2️⃣ Reverse Geocoding API 호출 시작");
        console.log("   요청 파라미터:", {
          coords: { lat, lng },
        });

        if (!window.naver?.maps?.Service?.reverseGeocode) {
          console.error("❌ reverseGeocode 메서드를 사용할 수 없습니다.");
          console.error("디버깅 정보:", {
            hasService: !!window.naver?.maps?.Service,
            hasReverseGeocode: typeof window.naver?.maps?.Service?.reverseGeocode === "function",
          });
          console.error("💡 가능한 원인:");
          console.error("   1. Reverse Geocoding API가 활성화되지 않음");
          console.error("   2. 네이버 클라우드 플랫폼 콘솔에서 API 권한 확인 필요");
          console.groupEnd();
          return;
        }

        const requestStartTime = Date.now();
        window.naver.maps.Service.reverseGeocode(
          {
            coords: new window.naver.maps.LatLng(lat, lng),
          },
          (status: any, response: any) => {
            const requestDuration = Date.now() - requestStartTime;
            console.log(`3️⃣ Reverse Geocoding 응답 수신 (${requestDuration}ms 소요)`);
            console.log("   응답 상태:", {
              status,
              statusCode: status,
              isError: status === window.naver.maps.Service.Status.ERROR,
              statusText: status === window.naver.maps.Service.Status.OK ? "OK" : 
                         status === window.naver.maps.Service.Status.ERROR ? "ERROR" : 
                         "UNKNOWN",
            });

            if (status === window.naver.maps.Service.Status.ERROR) {
              console.error("❌ Reverse Geocoding 실패");
              console.error("   응답 데이터:", response);
              console.error("💡 가능한 원인:");
              console.error("   1. Reverse Geocoding API 권한이 없음");
              console.error("   2. 네이버 클라우드 플랫폼 콘솔에서 Reverse Geocoding API 활성화 필요");
              console.error("   3. API 할당량 초과 (429 에러)");
              console.error("   4. 잘못된 좌표 값");
              console.groupEnd();
              return;
            }

            console.log("4️⃣ 응답 데이터 파싱:", {
              hasResponse: !!response,
              hasV2: !!response?.v2,
              hasAddress: !!response?.v2?.address,
              roadAddress: response?.v2?.address?.roadAddress,
              jibunAddress: response?.v2?.address?.jibunAddress,
            });

            const address =
              response.v2.address.roadAddress ||
              response.v2.address.jibunAddress ||
              `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

            console.log("5️⃣ 최종 주소:", {
              address,
              lat,
              lng,
            });

            // 마커 업데이트
            try {
              if (markerRef.current) {
                console.log("   기존 마커 위치 업데이트");
                markerRef.current.setPosition(new window.naver.maps.LatLng(lat, lng));
              } else {
                console.log("   새 마커 생성");
                markerRef.current = new window.naver.maps.Marker({
                  position: new window.naver.maps.LatLng(lat, lng),
                  map: map,
                });
              }
              console.log("✅ 마커 업데이트 완료");
            } catch (error) {
              console.error("❌ 마커 업데이트 실패:", error);
            }

            console.log("6️⃣ onChange 콜백 호출");
            onChange({ text: address, lat, lng });
            console.log("✅ Reverse Geocoding 완료");
            console.groupEnd();
          }
        );
      });
      console.log("✅ 지도 초기화 완료");
      console.groupEnd();
    } catch (error) {
      console.error("❌ 지도 초기화 실패");
      console.error("에러 상세:", error);
      console.error("에러 스택:", error instanceof Error ? error.stack : "스택 정보 없음");
      console.error("💡 가능한 원인:");
      console.error("   1. Dynamic Map API 권한이 없음");
      console.error("   2. 네이버 클라우드 플랫폼 콘솔에서 Dynamic Map API 활성화 필요");
      console.error("   3. Client ID가 올바르지 않음");
      console.error("   4. Web 서비스 URL이 등록되지 않음 (http://localhost:3000)");
      console.error("   5. 지도 컨테이너 크기가 0이거나 잘못됨");
      console.groupEnd();
    }
  }, [isMapLoaded, onChange, value]);

  // value 변경 시 마커 업데이트
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !value) {
      return;
    }

    if (!window.naver?.maps) {
      return;
    }

    try {
      const position = new window.naver.maps.LatLng(value.lat, value.lng);
      
      // 지도 중심 이동
      mapInstanceRef.current.setCenter(position);
      
      // 마커 업데이트
      if (markerRef.current) {
        markerRef.current.setPosition(position);
      } else {
        markerRef.current = new window.naver.maps.Marker({
          position: position,
          map: mapInstanceRef.current,
        });
      }
    } catch (error) {
      console.error("❌ 마커 업데이트 실패:", error);
    }
  }, [value, isMapLoaded]);

  // 장소명 검색어인지 판단하는 함수
  const isPlaceNameQuery = (query: string): boolean => {
    const placeKeywords = [
      "초등학교", "중학교", "고등학교", "학교", "초등", "중등", "고등",
      "학원", "병원", "은행", "약국", "마트", "편의점", "카페", "식당",
      "공원", "도서관", "체육관", "수영장", "영화관", "극장", "미술관",
      "박물관", "역", "정류장", "주차장", "아파트", "빌딩", "센터"
    ];
    return placeKeywords.some(keyword => query.includes(keyword));
  };

  // Local Search API로 장소 검색 (서버 사이드 API Route 사용)
  const searchPlaces = async (query: string): Promise<SearchResult[]> => {
    try {
      console.log(`🔍 Local Search API 검색 시작: "${query}"`);
      const requestStartTime = Date.now();

      const response = await fetch(`/api/search-places?query=${encodeURIComponent(query)}`);
      const requestDuration = Date.now() - requestStartTime;
      
      if (!response.ok) {
        console.log(`⚠️ Local Search API 요청 실패 (${response.status})`);
        return [];
      }

      const data = await response.json();
      console.log(`📍 Local Search API 응답 수신 (${requestDuration}ms 소요)`);
      
      if (data.items && data.items.length > 0) {
        console.log(`✅ Local Search API 검색 성공: ${data.items.length}개 결과 발견`);
        
        // Local Search API 결과는 주소만 있으므로, Geocoding으로 좌표 변환
        const results: SearchResult[] = await Promise.all(
          data.items.map(async (item: any) => {
            let x = "";
            let y = "";
            
            // 주소를 Geocoding으로 좌표 변환
            const address = item.roadAddress || item.address || "";
            if (address && window.naver?.maps?.Service?.geocode) {
              try {
                await new Promise<void>((resolve) => {
                  window.naver.maps.Service.geocode(
                    { query: address },
                    (status: any, response: any) => {
                      if (status === window.naver.maps.Service.Status.OK && response?.v2?.addresses?.[0]) {
                        const addr = response.v2.addresses[0];
                        x = String(addr.x || "");
                        y = String(addr.y || "");
                      }
                      resolve();
                    }
                  );
                });
              } catch (error) {
                console.error("Geocoding 변환 실패:", error);
              }
            }
            
            return {
              title: item.title || "",
              roadAddress: item.roadAddress || item.address || "",
              jibunAddress: item.address || "",
              x,
              y,
              category: item.category || "",
            };
          })
        );

        return results;
      } else {
        console.log(`⚠️ Local Search API 검색 결과 없음 (변형: "${query}")`);
        return [];
      }
    } catch (error) {
      console.error("❌ Local Search API 검색 중 오류:", error);
      return [];
    }
  };

  // 주소 검색
  const handleSearch = async () => {
    console.group("🔍 [네이버 지도] 주소 검색 시작");
    
    // 검색어 정제: 공백 정리, 앞뒤 공백 제거
    const cleanedQuery = searchQuery.trim().replace(/\s+/g, " ");
    
    console.log("1️⃣ 검색 조건 확인:", {
      hasSearchQuery: !!cleanedQuery,
      originalQuery: searchQuery,
      cleanedQuery,
      isMapLoaded,
      hasService: !!window.naver?.maps?.Service,
      hasGeocode: typeof window.naver?.maps?.Service?.geocode === "function",
      hasPlacesSearch: typeof window.naver?.maps?.Service?.placesSearch === "function",
      isPlaceName: isPlaceNameQuery(cleanedQuery),
    });

    if (!cleanedQuery) {
      console.warn("⚠️ 검색어가 비어있습니다.");
      console.groupEnd();
      return;
    }

    if (!window.naver?.maps?.Service) {
      console.error("❌ Service 객체를 사용할 수 없습니다.");
      if (!isMapLoaded) {
        console.error("   지도가 아직 로드되지 않았습니다.");
        alert("지도가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
      } else {
        console.error("   지도는 로드되었지만 Service 객체가 없습니다.");
        console.error("💡 가능한 원인:");
        console.error("   1. Geocoding API가 활성화되지 않음");
        console.error("   2. 네이버 클라우드 플랫폼 콘솔에서 Geocoding API 활성화 필요");
      }
      console.groupEnd();
      return;
    }

    console.log("2️⃣ 검색 시작");
    setIsSearching(true);

    // 검색어 단어 분리 및 변형 생성 함수
    const generateSearchVariations = (query: string): string[] => {
      const variations: string[] = [];
      const words = query.split(/\s+/).filter(w => w.length > 0);
      const noSpaceQuery = query.replace(/\s+/g, "");
      
      // 원본 및 기본 변형
      variations.push(query); // 원본
      variations.push(noSpaceQuery); // 공백 제거
      
      // 단어가 2개 이상인 경우 다양한 조합 생성
      if (words.length >= 2) {
        // 각 단어만
        words.forEach(word => {
          if (word.length >= 2) { // 최소 2글자 이상인 단어만
            variations.push(word);
          }
        });
        
        // 연속된 단어 조합 (2개씩)
        for (let i = 0; i < words.length - 1; i++) {
          const twoWords = words.slice(i, i + 2);
          variations.push(twoWords.join(""));
          variations.push(twoWords.join(" "));
        }
        
        // 모든 단어 조합 (공백 있음/없음)
        variations.push(words.join(""));
        variations.push(words.join(" "));
      }
      
      // "초등학교", "중학교", "고등학교" 같은 단어 제거 후 재시도
      const schoolKeywords = ["초등학교", "중학교", "고등학교", "학교", "초등", "중등", "고등"];
      schoolKeywords.forEach(keyword => {
        if (query.includes(keyword)) {
          const withoutKeyword = query.replace(new RegExp(keyword, "g"), "").trim();
          if (withoutKeyword && withoutKeyword.length >= 2) {
            variations.push(withoutKeyword);
            variations.push(withoutKeyword.replace(/\s+/g, ""));
            variations.push(withoutKeyword + " " + keyword);
            variations.push(withoutKeyword.replace(/\s+/g, "") + keyword);
            // 지역명과 함께
            variations.push(withoutKeyword + " 제주특별자치도");
            variations.push(withoutKeyword + " 제주시");
            variations.push(withoutKeyword.replace(/\s+/g, "") + " 제주특별자치도");
            variations.push(withoutKeyword.replace(/\s+/g, "") + " 제주시");
          }
        }
      });
      
      // 지역명 추가 변형 (원본과 공백 제거 버전 모두)
      const regionNames = ["제주특별자치도", "제주시", "제주"];
      regionNames.forEach(region => {
        variations.push(query + " " + region);
        variations.push(noSpaceQuery + " " + region);
        variations.push(region + " " + query);
        variations.push(region + " " + noSpaceQuery);
      });
      
      // 단어 순서 바꾸기 (예: "도남 초등학교" -> "초등학교 도남")
      if (words.length >= 2) {
        variations.push(words.slice().reverse().join(" "));
        variations.push(words.slice().reverse().join(""));
      }
      
      // 중복 제거 및 빈 문자열 제거, 최소 길이 체크
      return [...new Set(variations)].filter(q => q.length >= 2);
    };

    // 검색어 변형 목록 생성
    const searchVariations = generateSearchVariations(cleanedQuery);
    console.log("3️⃣ 검색어 변형 목록:", searchVariations);

    try {
      // 모든 검색 결과를 수집
      const allResults: SearchResult[] = [];
      let lastResponse: any = null;
      let lastStatus: any = null;
      const successfulQueries: string[] = [];
      
      // 장소명 검색어인 경우 Places API 우선 사용
      if (isPlaceNameQuery(cleanedQuery)) {
        console.log("4️⃣ 장소명 검색어로 판단, Places API 우선 사용");
        
        // 원본 검색어와 주요 변형만 Places API로 검색
        const placeSearchQueries = [
          cleanedQuery,
          cleanedQuery.replace(/\s+/g, ""), // 공백 제거
          ...searchVariations.slice(0, 3), // 상위 3개 변형
        ].filter((q, i, arr) => arr.indexOf(q) === i); // 중복 제거
        
        for (const query of placeSearchQueries) {
          const placeResults = await searchPlaces(query);
          if (placeResults.length > 0) {
            console.log(`✅ Places API 검색 성공 (변형: "${query}"): ${placeResults.length}개 결과`);
            successfulQueries.push(query);
            
            // 중복 제거하면서 결과 추가
            placeResults.forEach((result) => {
              const existing = allResults.find(
                (r) => r.x === result.x && r.y === result.y
              );
              if (!existing) {
                allResults.push(result);
              }
            });
            
            // 충분한 결과가 수집되면 조기 종료
            if (allResults.length >= 10) {
              console.log(`✅ 충분한 Places API 결과 수집됨 (${allResults.length}개), 검색 종료`);
              break;
            }
          }
        }
        
        // Places API 결과가 있으면 그것만 사용하고 Geocoding은 스킵
        if (allResults.length > 0) {
          console.log(`✅ Places API로 ${allResults.length}개 결과 수집 완료`);
          setSearchResults(allResults);
          setIsSearching(false);
          
          // 결과가 1개일 때만 자동 선택
          if (allResults.length === 1) {
            const firstResult = allResults[0];
            const lat = parseFloat(firstResult.y);
            const lng = parseFloat(firstResult.x);
            const addressText = firstResult.title 
              ? `${firstResult.title} (${firstResult.roadAddress || firstResult.jibunAddress})`
              : firstResult.roadAddress || firstResult.jibunAddress || cleanedQuery;

            if (!isNaN(lat) && !isNaN(lng)) {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setCenter(
                  new window.naver.maps.LatLng(lat, lng)
                );
                mapInstanceRef.current.setZoom(17);
                
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
          }
          console.groupEnd();
          return;
        }
        
        console.log("⚠️ Places API 결과 없음, Geocoding API로 폴백");
      }
      
      // Geocoding API 검색 (Places API 결과가 없거나 장소명이 아닌 경우)
      console.log("5️⃣ Geocoding API 검색 시작");
      
      // 여러 검색어 변형을 순차적으로 시도하고 결과 수집
      for (const query of searchVariations) {
        const requestStartTime = Date.now();
        console.log(`4️⃣ Geocoding API 호출 (변형: "${query}"):`, {
          query,
          requestTime: new Date().toISOString(),
        });

        // Promise로 변환하여 순차 실행
        await new Promise<void>((resolve) => {
          window.naver.maps.Service.geocode(
            {
              query: query,
            },
            (status: any, response: any) => {
              const requestDuration = Date.now() - requestStartTime;
              console.log(`5️⃣ Geocoding 응답 수신 (${requestDuration}ms 소요, 변형: "${query}")`);
              
              lastStatus = status;
              lastResponse = response;

              console.log("   응답 상태:", {
                status,
                statusCode: status,
                isError: status === window.naver.maps.Service.Status.ERROR,
                isOK: status === window.naver.maps.Service.Status.OK,
                statusText: status === window.naver.maps.Service.Status.OK ? "OK" : 
                           status === window.naver.maps.Service.Status.ERROR ? "ERROR" : 
                           "UNKNOWN",
              });

              if (status === window.naver.maps.Service.Status.OK) {
                const addresses = response?.v2?.addresses || [];
                console.log(`   검색 결과: ${addresses.length}개 발견`);
                
                if (addresses.length > 0) {
                  console.log(`✅ 검색 성공! (변형: "${query}")`);
                  successfulQueries.push(query);
                  // 결과 수집 (중복 제거를 위해 좌표로 비교)
                  addresses.forEach((addr: any) => {
                    const x = String(addr.x || addr.lng || "");
                    const y = String(addr.y || addr.lat || "");
                    const existing = allResults.find(
                      (r) => r.x === x && r.y === y
                    );
                    if (!existing) {
                      allResults.push({
                        roadAddress: addr.roadAddress || addr.road || addr.address || "",
                        jibunAddress: addr.jibunAddress || addr.jibun || "",
                        x,
                        y,
                      });
                    }
                  });
                } else {
                  console.log(`⚠️ 결과 없음 (변형: "${query}"), 다음 변형 시도...`);
                }
              }
              
              resolve();
            }
          );
        });

        // 충분한 결과가 수집되면 조기 종료 (최대 10개)
        if (allResults.length >= 10) {
          console.log(`✅ 충분한 결과 수집됨 (${allResults.length}개), 검색 종료`);
          break;
        }
      }

      setIsSearching(false);

      console.log("6️⃣ 수집된 검색 결과 확인:", {
        totalResults: allResults.length,
        successfulQueries: successfulQueries,
        successfulQueryCount: successfulQueries.length,
      });

      // 수집된 결과가 없으면 에러 처리
      if (allResults.length === 0) {
        // 모든 변형 시도 후에도 결과가 없는 경우
        if (lastStatus === window.naver.maps.Service.Status.ERROR) {
          console.error("❌ Geocoding 실패 (모든 변형 시도 실패)");
          console.error("   응답 데이터:", lastResponse);
          console.error("💡 가능한 원인:");
          console.error("   1. Geocoding API 권한이 없음");
          console.error("   2. 네이버 클라우드 플랫폼 콘솔에서 Geocoding API 활성화 필요");
          console.error("   3. API 할당량 초과 (429 에러)");
          console.error("   4. 잘못된 검색어 형식");
          console.error("   5. 네트워크 오류");
          alert("주소 검색에 실패했습니다. 다시 시도해주세요.");
        } else {
          console.warn("⚠️ 검색 결과가 없습니다 (모든 변형 시도 후).");
          console.log("   시도한 검색어들:", searchVariations);
          console.log("   성공한 검색어들:", successfulQueries);
          setSearchResults([]);
          alert(`"${cleanedQuery}"에 대한 검색 결과가 없습니다.\n\n다음과 같이 검색해보세요:\n- 더 정확한 주소 (예: "제주특별자치도 제주시 도남동")\n- 건물명이나 시설명 (예: "도남초등학교")\n- 도로명 주소 (예: "제주시 도남로")`);
        }
        console.groupEnd();
        return;
      }

      // 검색 결과 저장 (이미 SearchResult 형식으로 변환되어 있음)
      setSearchResults(allResults);
      console.log("7️⃣ 검색 결과 저장:", {
        resultCount: allResults.length,
        results: allResults.map((r, i) => ({
          index: i,
          title: r.title,
          roadAddress: r.roadAddress,
          jibunAddress: r.jibunAddress,
        })),
      });

      // 결과가 1개일 때만 자동 선택, 여러 개일 때는 드롭다운만 표시
      if (allResults.length === 1) {
        // 결과가 1개일 때 자동 선택
        const firstResult = allResults[0];
        const lat = parseFloat(firstResult.y);
        const lng = parseFloat(firstResult.x);
        const addressText = firstResult.title
          ? `${firstResult.title} (${firstResult.roadAddress || firstResult.jibunAddress})`
          : firstResult.roadAddress || firstResult.jibunAddress || cleanedQuery;

        console.log("8️⃣ 단일 결과 자동 선택:", {
          roadAddress: firstResult.roadAddress,
          jibunAddress: firstResult.jibunAddress,
          lat,
          lng,
          addressText,
        });

        if (isNaN(lat) || isNaN(lng)) {
          console.error("❌ 좌표 파싱 실패");
          console.error("   원본 데이터:", {
            y: firstResult.y,
            x: firstResult.x,
          });
          console.groupEnd();
          return;
        }

        // 지도 중심 이동 및 마커 표시
        if (mapInstanceRef.current) {
          console.log("9️⃣ 지도 중심 이동:", {
            lat,
            lng,
            zoom: 17,
          });
          try {
            mapInstanceRef.current.setCenter(
              new window.naver.maps.LatLng(lat, lng)
            );
            mapInstanceRef.current.setZoom(17);
            console.log("✅ 지도 중심 이동 완료");
          } catch (error) {
            console.error("❌ 지도 중심 이동 실패:", error);
          }

          // 마커 업데이트
          try {
            if (markerRef.current) {
              console.log("   기존 마커 위치 업데이트");
              markerRef.current.setPosition(
                new window.naver.maps.LatLng(lat, lng)
              );
            } else {
              console.log("   새 마커 생성");
              markerRef.current = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(lat, lng),
                map: mapInstanceRef.current,
              });
            }
            console.log("✅ 마커 업데이트 완료");
          } catch (error) {
            console.error("❌ 마커 업데이트 실패:", error);
          }
        } else {
          console.warn("⚠️ 지도 인스턴스가 없습니다. (mapInstanceRef.current가 null)");
        }

        console.log("🔟 onChange 콜백 호출 (단일 결과 자동 선택)");
        onChange({ text: addressText, lat, lng });
        console.log("✅ 주소 검색 완료:", {
          addressText,
          lat,
          lng,
        });
      } else {
        // 결과가 여러 개일 때는 드롭다운만 표시 (자동 선택 안 함)
        console.log("8️⃣ 여러 결과 발견, 드롭다운 표시 (자동 선택 안 함):", {
          resultCount: allResults.length,
          message: "사용자가 드롭다운에서 선택할 수 있습니다.",
        });
      }
      console.groupEnd();
    } catch (error) {
      console.error("❌ 주소 검색 중 예외 발생");
      console.error("에러 상세:", error);
      console.error("에러 스택:", error instanceof Error ? error.stack : "스택 정보 없음");
      console.error("에러 타입:", error instanceof Error ? error.constructor.name : typeof error);
      setIsSearching(false);
      alert("주소 검색 중 오류가 발생했습니다.");
      console.groupEnd();
    }
  };

  // 검색 결과 선택 핸들러
  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.y);
    const lng = parseFloat(result.x);
    const addressText = result.title
      ? `${result.title} (${result.roadAddress || result.jibunAddress})`
      : result.roadAddress || result.jibunAddress || searchQuery;

    if (isNaN(lat) || isNaN(lng)) {
      console.error("❌ 좌표 파싱 실패:", result);
      return;
    }

    console.group("📍 [네이버 지도] 검색 결과 선택");
    console.log("선택한 결과:", {
      roadAddress: result.roadAddress,
      jibunAddress: result.jibunAddress,
      lat,
      lng,
    });

    // 지도 중심 이동 및 마커 표시
    if (mapInstanceRef.current) {
      try {
        const position = new window.naver.maps.LatLng(lat, lng);
        mapInstanceRef.current.setCenter(position);
        mapInstanceRef.current.setZoom(17);

        if (markerRef.current) {
          markerRef.current.setPosition(position);
        } else {
          markerRef.current = new window.naver.maps.Marker({
            position: position,
            map: mapInstanceRef.current,
          });
        }
        console.log("✅ 지도 및 마커 업데이트 완료");
      } catch (error) {
        console.error("❌ 지도 업데이트 실패:", error);
      }
    }

    // 선택한 결과로 폼 업데이트
    onChange({ text: addressText, lat, lng });
    setSearchResults([]); // 검색 결과 목록 닫기
    setSearchQuery(addressText); // 검색어를 선택한 주소로 업데이트
    console.log("✅ 검색 결과 선택 완료");
    console.groupEnd();
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {/* 주소 검색 입력 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="주소를 검색하세요"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchResults([]); // 검색어 변경 시 결과 목록 초기화
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            disabled={!isMapLoaded}
          />
          {/* 검색 결과 목록 */}
          {searchResults.length > 0 && (
            <Card className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto">
              <CardContent className="p-2">
                <div className="space-y-1">
                  {searchResults.map((result, index) => {
                    const addressText = result.roadAddress || result.jibunAddress;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectResult(result)}
                        className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            {result.title && (
                              <div className="text-sm font-semibold truncate text-foreground">
                                {result.title}
                              </div>
                            )}
                            {result.roadAddress && (
                              <div className={`text-sm ${result.title ? 'text-muted-foreground' : 'font-medium'} truncate`}>
                                {result.roadAddress}
                              </div>
                            )}
                            {result.jibunAddress && result.jibunAddress !== result.roadAddress && (
                              <div className="text-xs text-muted-foreground truncate">
                                {result.jibunAddress}
                              </div>
                            )}
                            {!result.title && !result.roadAddress && !result.jibunAddress && (
                              <div className="text-sm">{addressText}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          disabled={!isMapLoaded || isSearching || !window.naver?.maps?.Service}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* 지도 */}
      <div
        ref={mapRef}
        className="w-full h-64 rounded-md border overflow-hidden relative"
        style={{ minHeight: "256px" }}
      >
        {/* 에러 메시지 표시 */}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center p-4 max-w-md">
              <div className="text-red-600 dark:text-red-400 font-semibold mb-2">
                ⚠️ 지도를 불러올 수 없습니다
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                {mapError}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>해결 방법:</div>
                <div className="text-left pl-4">
                  <div>1. 네이버 클라우드 플랫폼 콘솔 접속</div>
                  <div>2. Web 서비스 URL에 도메인 등록</div>
                  <div>3. Vercel 재배포</div>
                </div>
                <div className="mt-2 text-xs">
                  자세한 내용은 개발자에게 문의하세요.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 선택한 위치 표시 */}
      {value && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground p-2 bg-accent rounded-md">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{value.text}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={() => {
              onChange({ text: "", lat: 0, lng: 0 });
              setSearchQuery("");
              setSearchResults([]);
              if (markerRef.current) {
                markerRef.current.setMap(null);
                markerRef.current = null;
              }
            }}
          >
            <X className="h-3 w-3" />
          </Button>
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

