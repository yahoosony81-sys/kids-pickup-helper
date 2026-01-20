'use client';

/**
 * 사전 신청 폼 예시 컴포넌트
 * @description Lead 이벤트 추적이 적용된 사전 신청 폼
 * 
 * 주요 기능:
 * - 이메일 필수, 전화번호 선택
 * - 전화번호가 있으면 SHA-256 해싱 후 전송
 * - 전화번호가 없어도 이메일만으로 Lead 이벤트 전송
 * - 모든 개인정보는 암호화되어 전송
 */

import { useState } from 'react';
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

export default function PreRegistrationForm() {
    const { trackLead } = useMetaPixelTracking();

    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // 이메일 필수 검증
            if (!email || email.trim() === '') {
                setError('이메일을 입력해주세요.');
                setIsSubmitting(false);
                return;
            }

            // 이메일 형식 검증
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setError('올바른 이메일 형식이 아닙니다.');
                setIsSubmitting(false);
                return;
            }

            // Lead 이벤트 전송
            // 전화번호가 있으면 함께 전송, 없으면 이메일만 전송
            await trackLead(
                email,
                phone || undefined, // 빈 문자열이면 undefined로 변환
                {
                    source: 'pre_registration_form',
                    timestamp: new Date().toISOString(),
                }
            );

            // 성공 처리
            setIsSuccess(true);
            setEmail('');
            setPhone('');

            // 3초 후 성공 메시지 숨기기
            setTimeout(() => {
                setIsSuccess(false);
            }, 3000);

        } catch (err) {
            console.error('사전 신청 처리 실패:', err);
            setError('신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-md">
            <Card>
                <CardHeader>
                    <CardTitle>사전 신청</CardTitle>
                    <CardDescription>
                        서비스 출시 시 알림을 받으시려면 이메일을 입력해주세요.
                        <br />
                        전화번호는 선택사항입니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 이메일 입력 (필수) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">
                                이메일 <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="example@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* 전화번호 입력 (선택) */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                전화번호 <span className="text-muted-foreground text-sm">(선택사항)</span>
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="010-1234-5678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-muted-foreground">
                                전화번호를 입력하시면 더 정확한 맞춤 정보를 제공받으실 수 있습니다.
                            </p>
                        </div>

                        {/* 에러 메시지 */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* 성공 메시지 */}
                        {isSuccess && (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    사전 신청이 완료되었습니다! 🎉
                                    <br />
                                    <span className="text-xs">
                                        {phone ? '이메일과 전화번호가 안전하게 암호화되어 전송되었습니다.' : '이메일이 안전하게 암호화되어 전송되었습니다.'}
                                    </span>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* 제출 버튼 */}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '처리 중...' : '사전 신청하기'}
                        </Button>

                        {/* 보안 안내 */}
                        <p className="text-xs text-muted-foreground text-center">
                            🔒 모든 개인정보는 SHA-256 암호화되어 안전하게 전송됩니다.
                        </p>
                    </form>
                </CardContent>
            </Card>

            {/* 개발자용 정보 */}
            {process.env.NODE_ENV === 'development' && (
                <Card className="mt-4 bg-muted">
                    <CardHeader>
                        <CardTitle className="text-sm">개발자 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                        <p>
                            <strong>이메일 입력:</strong> {email || '(없음)'}
                        </p>
                        <p>
                            <strong>전화번호 입력:</strong> {phone || '(없음)'}
                        </p>
                        <p>
                            <strong>전송될 데이터:</strong>
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>이메일: {email ? 'SHA-256 해시값으로 전송' : '없음'}</li>
                            <li>전화번호: {phone ? 'SHA-256 해시값으로 전송' : '전송 안 됨 (선택사항)'}</li>
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
