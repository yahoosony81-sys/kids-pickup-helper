'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isConfirming, setIsConfirming] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get payment data from URL query parameters
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    useEffect(() => {
        if (!paymentKey || !orderId || !amount) {
            setError('결제 정보가 부족합니다.');
            setIsConfirming(false);
            return;
        }

        const confirmPayment = async () => {
            try {
                // Call server API to confirm payment
                const response = await fetch('/api/payments/confirm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        paymentKey,
                        orderId,
                        amount,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    // Handle server-side errors (e.g., amount mismatch, network error)
                    throw new Error(data.message || '결제 승인 중 오류가 발생했습니다.');
                }

                // Payment confirmed successfully
                setIsConfirming(false);
            } catch (err: any) {
                console.error('Payment confirmation error:', err);
                setError(err.message);
                setIsConfirming(false);
            }
        };

        confirmPayment();
    }, [paymentKey, orderId, amount]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow text-center">
                {isConfirming ? (
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">결제 확인 중...</h2>
                        <p className="mt-2 text-sm text-gray-600">잠시만 기다려주세요.</p>
                    </div>
                ) : error ? (
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-red-600">결제 실패</h2>
                        <p className="mt-2 text-sm text-gray-600">{error}</p>
                        <div className="mt-6">
                            <button
                                onClick={() => router.push('/payment/checkout')}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                다시 결제하기
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-green-600">결제 성공!</h2>
                        <p className="mt-2 text-sm text-gray-600">주문이 성공적으로 처리되었습니다.</p>
                        <div className="mt-4 text-left bg-gray-50 p-4 rounded">
                            <p><strong>주문번호:</strong> {orderId}</p>
                            <p><strong>결제금액:</strong> {Number(amount).toLocaleString()}원</p>
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={() => router.push('/')}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                홈으로 돌아가기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
