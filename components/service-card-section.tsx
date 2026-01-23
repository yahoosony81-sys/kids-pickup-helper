import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Users, Car, ShieldCheck, MapPin, Camera } from "lucide-react"

export function ServiceCardSection() {
  return (
    <section className="px-4 pb-8 pt-4 mt-auto">
      <div className="max-w-md mx-auto">
        {/* Trust Indicators */}
        <div className="flex justify-center items-center gap-3 mb-3 text-[10px] sm:text-xs text-white font-medium drop-shadow-md">
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
            <ShieldCheck className="w-3 h-3 text-green-400" />
            <span>같은 학교 인증 100%</span>
          </div>
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
            <MapPin className="w-3 h-3 text-sky-400" />
            <span>실시간 이동 확인</span>
          </div>
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
            <Camera className="w-3 h-3 text-amber-400" />
            <span>도착 사진 전송</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Orange Button - Request Pickup */}
          <Link href="/pickup-requests/new" className="block w-full">
            <Button
              size="default"
              className="w-full h-12 text-base rounded-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-300 font-bold flex items-center justify-center gap-2 border-none"
            >
              <Users className="h-5 w-5" />
              우리 아이 픽업 부탁해요.
            </Button>
          </Link>

          {/* Light Blue Button - Provide Pickup */}
          <Link href="/trips/new" className="block w-full">
            <Button
              size="default"
              className="w-full h-12 text-base rounded-full bg-sky-50 hover:bg-sky-100 text-sky-600 border-2 border-sky-400 shadow-md hover:shadow-lg transition-all duration-300 font-bold flex items-center justify-center gap-2"
            >
              <Car className="h-5 w-5" />
              제가 안전하게 픽업해 드릴게요.
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
