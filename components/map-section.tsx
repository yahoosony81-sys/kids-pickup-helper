import { Navigation, Radio } from "lucide-react"

export function MapSection() {
  return (
    <section className="px-4 py-8 bg-amber-50">
      <div className="max-w-md mx-auto">
        <div className="relative rounded-2xl shadow-lg overflow-hidden border-2 border-sky-200 min-h-[220px]">
          {/* Map Background */}
          <div className="absolute inset-0">
            <img
              src="/map-preview.png"
              alt="지도"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-sky-50/40 to-transparent" />
          </div>
        </div>

        {/* Caption */}
        <p className="text-center text-lg font-bold text-red-600 mt-3">
          아이의 이동 과정을 실시간으로 확인하고 안심하세요.
        </p>
      </div>
    </section>
  )
}
