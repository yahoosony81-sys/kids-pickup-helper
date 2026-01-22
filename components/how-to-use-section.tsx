export function HowToUseSection() {
  const steps = [
    { number: "1", text: "픽업이 필요한 학부모가 요청" },
    { number: "2", text: "같은 학교 학부모가 픽업 수행" },
    { number: "3", text: "이동 경로·도착 사진을 실시간 확인" },
  ]

  return (
    <section className="px-4 py-8 bg-amber-50">
      <div className="max-w-md mx-auto">
        <h3 className="text-base font-bold text-amber-800 text-center mb-6">이 서비스는 어떻게 사용하나요?</h3>

        <div className="relative w-full" style={{ height: "220px" }}>
          {/* Step 1 - 상단 중앙 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0">
            <div className="w-28 h-24 bg-white rounded-xl shadow-sm border border-amber-100 flex flex-col items-center justify-center p-2">
              <div className="w-7 h-7 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full flex items-center justify-center mb-2">
                <span className="text-white font-bold text-xs">{steps[0].number}</span>
              </div>
              <span className="text-xs text-gray-700 font-medium text-center leading-tight">{steps[0].text}</span>
            </div>
          </div>

          {/* Step 2 - 하단 왼쪽 */}
          <div className="absolute left-2 bottom-0">
            <div className="w-28 h-24 bg-white rounded-xl shadow-sm border border-amber-100 flex flex-col items-center justify-center p-2">
              <div className="w-7 h-7 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full flex items-center justify-center mb-2">
                <span className="text-white font-bold text-xs">{steps[1].number}</span>
              </div>
              <span className="text-xs text-gray-700 font-medium text-center leading-tight">{steps[1].text}</span>
            </div>
          </div>

          {/* Step 3 - 하단 오른쪽 */}
          <div className="absolute right-2 bottom-0">
            <div className="w-28 h-24 bg-white rounded-xl shadow-sm border border-amber-100 flex flex-col items-center justify-center p-2">
              <div className="w-7 h-7 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full flex items-center justify-center mb-2">
                <span className="text-white font-bold text-xs">{steps[2].number}</span>
              </div>
              <span className="text-xs text-gray-700 font-medium text-center leading-tight">{steps[2].text}</span>
            </div>
          </div>

          {/* 화살표 SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 220">
            {/* 1 → 2 화살표 (상단 중앙에서 하단 왼쪽으로) */}
            <path
              d="M 120 95 Q 80 130 70 150"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            {/* 2 → 3 화살표 (하단 왼쪽에서 하단 오른쪽으로) */}
            <path
              d="M 115 175 Q 150 185 185 175"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            {/* 3 → 1 화살표 (하단 오른쪽에서 상단 중앙으로) */}
            <path
              d="M 230 150 Q 220 130 180 95"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            {/* 화살표 마커 정의 */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>
    </section>
  )
}
