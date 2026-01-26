'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function FailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const message = searchParams.get('message') || '알 수 없는 오류가 발생했습니다.';
    const code = searchParams.get('code');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow text-center">
                <div>
                    <h2 className="mt-6 text-3xl font-extrabold text-red-600">결제 실패</h2>
                    <p className="mt-2 text-sm text-gray-600">{message}</p>
                    {code && <p className="text-xs text-gray-400 mt-1">에러 코드: {code}</p>}
                </div>
                <div className="mt-6">
                    <button
                        onClick={() => router.push('/payment/checkout')}
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        다시 시도하기
                    </button>
                </div>
            </div>
        </div>
    );
}
