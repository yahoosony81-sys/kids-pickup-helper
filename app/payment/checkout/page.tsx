import PaymentCheckout from '@/components/payment/PaymentCheckout';

export default function CheckoutPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <PaymentCheckout />
        </div>
    );
}
