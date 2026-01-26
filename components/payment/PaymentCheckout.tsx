'use client';

import { useEffect, useRef, useState } from 'react';
import { loadPaymentWidget, PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';
import { nanoid } from 'nanoid';

// Toss Payments Client Key from environment variables
const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY as string;
// Customer Key (can be a unique user ID or a random string for anonymous users)
const customerKey = nanoid();

export default function PaymentCheckout() {
    const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
    const paymentMethodsWidgetRef = useRef<ReturnType<PaymentWidgetInstance['renderPaymentMethods']> | null>(null);
    const isLoadedRef = useRef(false); // Prevent double initialization in Strict Mode

    const [price] = useState(10000); // Default price: 10,000 KRW
    const [orderName] = useState('우리아이 픽업이모 이용권');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Prevent double initialization
        if (isLoadedRef.current || paymentWidgetRef.current) return;
        isLoadedRef.current = true;

        (async () => {
            try {
                // 0. Check if DOM elements exist
                const paymentWidgetDiv = document.getElementById('payment-widget');
                const agreementDiv = document.getElementById('agreement');

                if (!paymentWidgetDiv || !agreementDiv) {
                    console.error('Payment widget DOM elements not found');
                    return;
                }

                // 1. Load the Payment Widget
                const paymentWidget = await loadPaymentWidget(clientKey, customerKey);
                paymentWidgetRef.current = paymentWidget;

                // 2. Render Payment Methods
                // renderPaymentMethods returns a Promise that resolves to the widget instance
                const paymentMethodsWidget = await paymentWidget.renderPaymentMethods(
                    '#payment-widget',
                    { value: price },
                    { variantKey: 'DEFAULT' }
                );
                paymentMethodsWidgetRef.current = paymentMethodsWidget;

                // 3. Render Agreement
                await paymentWidget.renderAgreement('#agreement', { variantKey: 'AGREEMENT' });

                // 4. Set Ready State
                setIsReady(true);
            } catch (error) {
                console.error('Error loading Payment Widget:', error);
                setIsReady(false);
            }
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const paymentMethodsWidget = paymentMethodsWidgetRef.current;

        if (paymentMethodsWidget == null) {
            return;
        }

        // Update amount if price changes
        paymentMethodsWidget.updateAmount(price);
    }, [price]);

    const handlePaymentRequest = async () => {
        const paymentWidget = paymentWidgetRef.current;

        if (!isReady || !paymentWidget) {
            alert('결제창이 아직 준비되지 않았습니다. 잠시만 기다려주세요.');
            return;
        }

        // Double check DOM rendering
        const widgetDiv = document.getElementById('payment-widget');
        if (!widgetDiv || widgetDiv.childElementCount === 0) {
            console.warn('Payment widget DOM is empty, waiting...');
            // Wait a bit if DOM is not ready (though isReady should prevent this)
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        try {
            // 4. Request Payment
            await paymentWidget.requestPayment({
                orderId: nanoid(),
                orderName: orderName,
                customerName: '김토스',
                customerEmail: 'customer@example.com',
                customerMobilePhone: '01012345678',
                successUrl: `${window.location.origin}/payment/success`,
                failUrl: `${window.location.origin}/payment/fail`,
            });
        } catch (error) {
            console.error('Payment request failed:', error);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">주문서</h1>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">상품명</label>
                <p className="text-lg">{orderName}</p>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700">결제 금액</label>
                <p className="text-xl font-bold text-blue-600">{price.toLocaleString()}원</p>
            </div>

            {/* Payment Widget Container */}
            {/* Ensure IDs match exactly what is passed to render methods */}
            <div id="payment-widget" className="w-full min-h-[200px]" />

            {/* Agreement Container */}
            <div id="agreement" className="w-full" />

            <button
                onClick={handlePaymentRequest}
                disabled={!isReady}
                className={`w-full font-bold py-3 px-4 rounded transition duration-200 mt-4 ${isReady
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {isReady ? '결제하기' : '로딩 중...'}
            </button>
        </div>
    );
}
