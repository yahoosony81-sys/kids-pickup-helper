/**
 * @file app/(routes)/test/realtime-location/page.tsx
 * @description 실시간 위치 공유 테스트 페이지
 * 
 * 실제 위치 추적 없이 시뮬레이션된 위치로 테스트 가능
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Play, Square, MapPin, Loader2 } from "lucide-react";
import { Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";

// Supabase 클라이언트
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 테스트용 경로 (제주도 해안도로)
const testRoute = [
    { lat: 33.4996, lng: 126.5312 }, // 제주공항 근처
    { lat: 33.4980, lng: 126.5350 },
    { lat: 33.4965, lng: 126.5390 },
    { lat: 33.4950, lng: 126.5430 },
    { lat: 33.4935, lng: 126.5470 },
    { lat: 33.4920, lng: 126.5510 },
    { lat: 33.4905, lng: 126.5550 },
    { lat: 33.4890, lng: 126.5590 },
    { lat: 33.4875, lng: 126.5630 },
    { lat: 33.4860, lng: 126.5670 },
];

interface LocationData {
    lat: number;
    lng: number;
    timestamp: number;
}

export default function RealtimeLocationTestPage() {
    const [tripId, setTripId] = useState("test-trip-123");
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [log, setLog] = useState<string[]>([]);

    // 구독 상태 (요청자 화면용)
    const [receivedLocation, setReceivedLocation] = useState<LocationData | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);

    const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const subscribeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // 카카오맵 로더
    const [mapLoading, mapError] = useKakaoLoader({
        appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY!,
    });

    const addLog = (message: string) => {
        setLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    // 구독 시작 (요청자 화면)
    const startSubscribe = () => {
        if (isSubscribed) return;

        const channelName = `trip-location-${tripId}`;
        subscribeChannelRef.current = supabase.channel(channelName + "-subscriber");

        subscribeChannelRef.current
            .on("broadcast", { event: "location" }, (payload) => {
                console.log("📍 위치 수신:", payload.payload);
                addLog(`📥 수신: ${payload.payload.lat.toFixed(4)}, ${payload.payload.lng.toFixed(4)}`);
                setReceivedLocation(payload.payload as LocationData);
            })
            .subscribe((status) => {
                console.log("📡 구독 상태:", status);
                addLog(`구독 상태: ${status}`);
                if (status === "SUBSCRIBED") {
                    setIsSubscribed(true);
                }
            });
    };

    // 브로드캐스트 시작
    const startBroadcast = () => {
        if (isBroadcasting) return;

        // 먼저 구독 시작
        startSubscribe();

        const channelName = `trip-location-${tripId}`;
        broadcastChannelRef.current = supabase.channel(channelName);

        broadcastChannelRef.current.subscribe((status) => {
            addLog(`브로드캐스트 채널: ${status}`);
            if (status === "SUBSCRIBED") {
                setIsBroadcasting(true);
                setCurrentIndex(0);

                // 2초마다 다음 위치 전송
                intervalRef.current = setInterval(() => {
                    setCurrentIndex((prev) => {
                        const nextIndex = (prev + 1) % testRoute.length;
                        const location = testRoute[nextIndex];

                        broadcastChannelRef.current?.send({
                            type: "broadcast",
                            event: "location",
                            payload: {
                                tripId,
                                lat: location.lat,
                                lng: location.lng,
                                timestamp: Date.now(),
                            },
                        });

                        addLog(`📤 전송: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
                        return nextIndex;
                    });
                }, 2000);
            }
        });
    };

    // 브로드캐스트 중지
    const stopBroadcast = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (broadcastChannelRef.current) {
            broadcastChannelRef.current.send({
                type: "broadcast",
                event: "tracking_ended",
                payload: { tripId },
            });
            supabase.removeChannel(broadcastChannelRef.current);
            broadcastChannelRef.current = null;
        }

        if (subscribeChannelRef.current) {
            supabase.removeChannel(subscribeChannelRef.current);
            subscribeChannelRef.current = null;
        }

        setIsBroadcasting(false);
        setIsSubscribed(false);
        setReceivedLocation(null);
        addLog("🛑 브로드캐스트 중지");
    };

    // 정리
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (broadcastChannelRef.current) supabase.removeChannel(broadcastChannelRef.current);
            if (subscribeChannelRef.current) supabase.removeChannel(subscribeChannelRef.current);
        };
    }, []);

    // 지도 중심
    const mapCenter = receivedLocation
        ? { lat: receivedLocation.lat, lng: receivedLocation.lng }
        : { lat: 33.4996, lng: 126.5312 }; // 기본값: 제주공항

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">🚗 실시간 위치 공유 테스트</h1>

            <div className="grid md:grid-cols-2 gap-6">
                {/* 제공자 시뮬레이션 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5" />
                            제공자 시뮬레이션
                        </CardTitle>
                        <CardDescription>
                            위치를 2초마다 브로드캐스트합니다
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Trip ID</label>
                            <Input
                                value={tripId}
                                onChange={(e) => setTripId(e.target.value)}
                                placeholder="Trip ID 입력"
                                disabled={isBroadcasting}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={startBroadcast}
                                disabled={isBroadcasting || !tripId}
                                className="flex-1"
                            >
                                <Play className="mr-2 h-4 w-4" />
                                시작
                            </Button>
                            <Button
                                onClick={stopBroadcast}
                                disabled={!isBroadcasting}
                                variant="destructive"
                                className="flex-1"
                            >
                                <Square className="mr-2 h-4 w-4" />
                                중지
                            </Button>
                        </div>

                        <div className="text-sm">
                            <p className="font-medium mb-1">현재 위치 ({currentIndex + 1}/{testRoute.length})</p>
                            <p className="text-muted-foreground font-mono">
                                {testRoute[currentIndex].lat.toFixed(4)}, {testRoute[currentIndex].lng.toFixed(4)}
                            </p>
                        </div>

                        {/* 로그 */}
                        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 h-40 overflow-y-auto">
                            <p className="text-xs font-medium mb-1">로그</p>
                            {log.map((l, i) => (
                                <p key={i} className="text-xs font-mono text-muted-foreground">{l}</p>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 요청자 화면 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            요청자 화면
                            {isSubscribed && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">구독중</span>
                            )}
                        </CardTitle>
                        <CardDescription>
                            실시간 위치를 지도에서 확인합니다
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {mapLoading ? (
                            <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                <span className="ml-2 text-sm text-gray-600">지도 로딩 중...</span>
                            </div>
                        ) : mapError ? (
                            <div className="flex items-center justify-center h-48 bg-red-50 rounded-lg">
                                <span className="text-sm text-red-600">지도 로드 실패</span>
                            </div>
                        ) : (
                            <div className="rounded-lg overflow-hidden">
                                <Map
                                    center={mapCenter}
                                    style={{ width: "100%", height: "200px" }}
                                    level={5}
                                >
                                    {receivedLocation && (
                                        <MapMarker
                                            position={{ lat: receivedLocation.lat, lng: receivedLocation.lng }}
                                            image={{
                                                src: "https://cdn-icons-png.flaticon.com/512/3097/3097144.png",
                                                size: { width: 40, height: 40 },
                                                options: { offset: { x: 20, y: 20 } },
                                            }}
                                        />
                                    )}
                                </Map>
                                {receivedLocation && (
                                    <div className="bg-gray-100 px-3 py-1 text-xs text-gray-500 text-center">
                                        마지막 수신: {new Date(receivedLocation.timestamp).toLocaleTimeString("ko-KR")}
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground text-center mt-2">
                            {isBroadcasting ? "🟢 위치 수신 대기 중..." : "⏹️ 시작 버튼을 눌러주세요"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>테스트 방법:</strong>
                </p>
                <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside mt-2 space-y-1">
                    <li>Trip ID를 입력합니다 (또는 기본값 사용)</li>
                    <li>&quot;시작&quot; 버튼을 클릭합니다</li>
                    <li>오른쪽 지도에서 차량 아이콘이 2초마다 이동하는지 확인합니다</li>
                    <li>테스트가 끝나면 &quot;중지&quot; 버튼을 클릭합니다</li>
                </ol>
            </div>
        </div>
    );
}
