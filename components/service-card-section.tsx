import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Users, Car } from "lucide-react"

export function ServiceCardSection() {
  return (
    <section className="px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg border border-amber-100">
          {/* Service Introduction */}
          <p className="text-base font-semibold text-gray-800 text-center mb-6 leading-relaxed">
            <span className="text-amber-800 font-bold text-xl">&apos;우리 아이 픽업이모&apos;</span>는<br />
            같은 학교 학부모끼리 연결되어
            <br />
            아이 이동을 안전하게 돕는 서비스입니다.
          </p>

          <div className="space-y-3 mb-5">
            {/* Orange Button - Request Pickup */}
            <Link href="/pickup-requests/new" className="block w-full">
              <Button
                size="default"
                className="w-full h-12 text-base rounded-full bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-md hover:shadow-lg transition-all duration-300 font-bold flex items-center justify-center gap-2"
              >
                <Users className="h-5 w-5" />
                우리 아이 픽업 부탁해요.
              </Button>
            </Link>

            {/* Light Blue Button - Provide Pickup */}
            <Link href="/trips/new" className="block w-full">
              <Button
                size="default"
                variant="outline"
                className="w-full h-12 text-base rounded-full border-2 border-sky-400 bg-sky-50 hover:bg-sky-100 text-sky-600 shadow-md hover:shadow-lg transition-all duration-300 font-bold flex items-center justify-center gap-2"
              >
                <Car className="h-5 w-5" />
                제가 안전하게 픽업해 드릴게요.
              </Button>
            </Link>
          </div>

          <p className="text-sm text-amber-700 text-center leading-relaxed">
            같은 학교 학부모님은 서비스를 요청할 수도 있고,
            <br />
            서비스를 제공할 수도 있습니다.
          </p>
        </div>
      </div>
    </section>
  )
}
