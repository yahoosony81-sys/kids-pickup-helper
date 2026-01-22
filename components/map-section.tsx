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

          {/* Animated Car on Route */}
          <div className="absolute top-1/3 left-1/4 animate-[drive_8s_ease-in-out_infinite]">
            <div className="relative">
              <div className="absolute -inset-2 bg-yellow-400 rounded-full opacity-30 animate-ping" />
              <div className="relative bg-yellow-400 p-2 rounded-full shadow-lg border-2 border-white">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
              </div>
            </div>
          </div>

          {/* School Location Pin */}
          <div className="absolute top-1/4 right-1/3">
            <div className="relative">
              <div className="absolute -inset-1 bg-mint-400 rounded-full opacity-20 animate-pulse" />
              <div className="relative bg-emerald-500 p-1.5 rounded-full shadow-lg border-2 border-white">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2 py-1.5 rounded-xl shadow-md border border-sky-200 flex items-center gap-2">
            <div className="relative">
              <Radio className="w-3 h-3 text-yellow-500" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-medium">실시간 위치 추적</p>
              <p className="text-xs font-bold text-sky-700">운행 중</p>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm p-2.5 rounded-xl shadow-md border border-sky-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sky-500" />
                <div>
                  <p className="text-xs font-bold text-gray-800">서울초등학교 → 집</p>
                  <p className="text-[10px] text-gray-600">예상 도착: 5분 후</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">남은 거리</p>
                <p className="text-xs font-bold text-sky-700">1.2km</p>
              </div>
            </div>
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
