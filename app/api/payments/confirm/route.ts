import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { paymentKey, orderId, amount } = body;

        // Toss Payments Secret Key from environment variables
        const secretKey = process.env.TOSS_SECRET_KEY;

        if (!secretKey) {
            console.error('TOSS_SECRET_KEY is not set');
            return NextResponse.json(
                { message: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Encode secret key to Base64 for Basic Auth
        // The format is "Basic " + base64("SECRET_KEY:")
        const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');

        // Call Toss Payments Confirm API
        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basicAuth}`,
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
            // Handle Toss Payments API errors
            // e.g., ALREADY_PROCESSED_PAYMENT, PROVIDER_ERROR, BALANCE_INSUFFICIENT
            console.error('Toss Payments Confirm Error:', data);

            // Return a user-friendly error message based on the error code if needed
            return NextResponse.json(
                {
                    message: data.message || '결제 승인에 실패했습니다.',
                    code: data.code
                },
                { status: response.status }
            );
        }

        // Payment Success!
        // TODO: Update your database here (e.g., set order status to PAID, grant credits)

        return NextResponse.json(data, { status: 200 });

    } catch (error: any) {
        console.error('Payment confirmation internal error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
