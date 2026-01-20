'use client';

/**
 * 메타 픽셀 테스트 페이지
 * @description 메타 픽셀 구현을 테스트하고 검증하는 페이지
 * 
 * 접속 경로: /meta-pixel-test
 * 
 * 테스트 항목:
 * 1. 픽셀 로드 확인
 * 2. 고급 매칭 데이터 확인
 * 3. 이벤트 전송 테스트
 * 4. SHA-256 해싱 테스트
 */

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';
import { hashEmail, hashPhone } from '@/lib/meta-pixel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function MetaPixelTestPage() {
    const { user, isLoaded } = useUser();
    const { trackRegistration, trackLead, trackCustom } = useMetaPixelTracking();
    const [testEmail, setTestEmail] = useState('test@example.com');
    const [testPhone, setTestPhone] = useState('+821012345678');
    const [hashedEmail, setHashedEmail] = useState('');
    const [hashedPhone, setHashedPhone] = useState('');
    const [eventSent, setEventSent] = useState(false);

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const isPixelConfigured = !!pixelId;
    const isPixelLoaded = typeof window !== 'undefined' && !!window.fbq;

    const handleHashTest = async () => {
        const emailHash = await hashEmail(testEmail);
        const phoneHash = await hashPhone(testPhone);
        setHashedEmail(emailHash);
        setHashedPhone(phoneHash);
    };

    const handleTestRegistration = async () => {
        await trackRegistration(testEmail, testPhone, {
            test_mode: true,
            source: 'test_page',
        });
        setEventSent(true);
        setTimeout(() => setEventSent(false), 3000);
    };

    const handleTestLead = async () => {
        await trackLead(testEmail, testPhone, {
            test_mode: true,
            source: 'test_page',
        });
        setEventSent(true);
        setTimeout(() => setEventSent(false), 3000);
    };

    const handleTestLeadEmailOnly = async () => {
        await trackLead(testEmail, undefined, {
            test_mode: true,
            source: 'test_page',
            note: 'email_only',
        });
        setEventSent(true);
        setTimeout(() => setEventSent(false), 3000);
    };

    const handleTestCustomEvent = () => {
        trackCustom('TestEvent', {
            test_mode: true,
            timestamp: new Date().toISOString(),
        });
        setEventSent(true);
        setTimeout(() => setEventSent(false), 3000);
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">메타 픽셀 테스트</h1>
            <p className="text-muted-foreground mb-8">
                메타 픽셀 구현을 테스트하고 검증합니다. Chrome에서{' '}
                <a
                    href="https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                >
                    Meta Pixel Helper
                </a>
                를 설치하여 이벤트를 확인하세요.
            </p>

            {/* 상태 확인 */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>1. 픽셀 상태 확인</CardTitle>
                    <CardDescription>메타 픽셀 설정 및 로드 상태를 확인합니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                        {isPixelConfigured ? (
                            <CheckCircle2 className="text-green-600" />
                        ) : (
                            <XCircle className="text-red-600" />
                        )}
                        <span>
                            픽셀 ID 설정: {isPixelConfigured ? `✓ (${pixelId})` : '✗ (.env.local에 설정 필요)'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isPixelLoaded ? (
                            <CheckCircle2 className="text-green-600" />
                        ) : (
                            <XCircle className="text-red-600" />
                        )}
                        <span>픽셀 스크립트 로드: {isPixelLoaded ? '✓' : '✗'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isLoaded && user ? (
                            <CheckCircle2 className="text-green-600" />
                        ) : (
                            <AlertCircle className="text-yellow-600" />
                        )}
                        <span>
                            사용자 로그인: {isLoaded && user ? `✓ (${user.primaryEmailAddress?.emailAddress})` : '로그인 필요'}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* SHA-256 해싱 테스트 */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>2. SHA-256 해싱 테스트</CardTitle>
                    <CardDescription>이메일과 전화번호가 안전하게 해싱되는지 확인합니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4">
                        <div>
                            <Label htmlFor="test-email">테스트 이메일</Label>
                            <Input
                                id="test-email"
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder="test@example.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="test-phone">테스트 전화번호</Label>
                            <Input
                                id="test-phone"
                                type="tel"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                placeholder="+821012345678"
                            />
                        </div>
                        <Button onClick={handleHashTest}>해싱 테스트</Button>
                    </div>

                    {hashedEmail && (
                        <div className="mt-4 space-y-2">
                            <div className="p-3 bg-muted rounded-md">
                                <p className="text-sm font-medium mb-1">원본 이메일:</p>
                                <code className="text-xs">{testEmail}</code>
                            </div>
                            <div className="p-3 bg-muted rounded-md">
                                <p className="text-sm font-medium mb-1">해싱된 이메일 (SHA-256):</p>
                                <code className="text-xs break-all">{hashedEmail}</code>
                            </div>
                            <div className="p-3 bg-muted rounded-md">
                                <p className="text-sm font-medium mb-1">원본 전화번호:</p>
                                <code className="text-xs">{testPhone}</code>
                            </div>
                            <div className="p-3 bg-muted rounded-md">
                                <p className="text-sm font-medium mb-1">해싱된 전화번호 (SHA-256):</p>
                                <code className="text-xs break-all">{hashedPhone}</code>
                            </div>
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>보안 확인</AlertTitle>
                                <AlertDescription>
                                    위의 해시값만 메타로 전송됩니다. 원본 데이터는 절대 전송되지 않습니다.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 이벤트 전송 테스트 */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>3. 이벤트 전송 테스트</CardTitle>
                    <CardDescription>메타 픽셀 이벤트가 정상적으로 전송되는지 확인합니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3">
                        <Button onClick={handleTestRegistration} disabled={!isPixelLoaded}>
                            CompleteRegistration 이벤트 전송
                        </Button>
                        <Button onClick={handleTestLead} variant="secondary" disabled={!isPixelLoaded}>
                            Lead 이벤트 전송 (이메일 + 전화번호)
                        </Button>
                        <Button onClick={handleTestLeadEmailOnly} variant="secondary" disabled={!isPixelLoaded}>
                            Lead 이벤트 전송 (이메일만)
                        </Button>
                        <Button onClick={handleTestCustomEvent} variant="outline" disabled={!isPixelLoaded}>
                            커스텀 이벤트 전송
                        </Button>
                    </div>

                    {eventSent && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>이벤트 전송 완료</AlertTitle>
                            <AlertDescription>
                                Meta Pixel Helper 또는 브라우저 네트워크 탭에서 이벤트를 확인하세요.
                            </AlertDescription>
                        </Alert>
                    )}

                    {!isPixelLoaded && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>픽셀이 로드되지 않음</AlertTitle>
                            <AlertDescription>
                                .env.local에 NEXT_PUBLIC_META_PIXEL_ID를 설정하고 개발 서버를 재시작하세요.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* 확인 방법 */}
            <Card>
                <CardHeader>
                    <CardTitle>4. 이벤트 확인 방법</CardTitle>
                    <CardDescription>전송된 이벤트를 확인하는 방법</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <h4 className="font-medium mb-2">방법 1: Meta Pixel Helper (권장)</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Chrome 확장 프로그램 설치</li>
                            <li>이 페이지에서 이벤트 전송 버튼 클릭</li>
                            <li>브라우저 우측 상단의 Meta Pixel Helper 아이콘 클릭</li>
                            <li>전송된 이벤트 및 파라미터 확인</li>
                        </ol>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">방법 2: 브라우저 개발자 도구</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>F12 키를 눌러 개발자 도구 열기</li>
                            <li>Network 탭 선택</li>
                            <li>이벤트 전송 버튼 클릭</li>
                            <li>
                                <code className="bg-muted px-1 rounded">facebook.com/tr</code> 요청 확인
                            </li>
                            <li>Payload에서 em, ph 파라미터 확인</li>
                        </ol>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">방법 3: Meta Events Manager</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>
                                <a
                                    href="https://business.facebook.com/events_manager2"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                >
                                    Meta Events Manager
                                </a>{' '}
                                접속
                            </li>
                            <li>픽셀 선택</li>
                            <li>테스트 이벤트 탭에서 실시간 이벤트 확인</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
