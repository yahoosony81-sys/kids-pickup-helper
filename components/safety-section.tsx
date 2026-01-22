import { Check } from "lucide-react"

export function SafetySection() {
  const safetyPoints = [
    {
      title: "서비스 제공은 학부모 인증을 거친 경우만 가능",
      description:
        "자녀의 재학증명서, 가족관계증명서, 알림장캡쳐 등의 인증절차 후 참여 가능 (요청자는 서류첨부 없이 자유롭게 서비스 이용가능)",
    },
    {
      title: "실시간 위치 공유",
      description: "이동 중 위치가 보호자에게 자동 공유",
    },
    {
      title: "도착 사진 인증",
      description: "목적지 도착 시 사진으로 확인",
    },
    {
      title: "택시보다 더 안전하고 경제적인 이동",
      description: "경로가 같은 아이 3명까지 함께 이동",
    },
  ]

  return (
    <section className="px-4 py-8 bg-amber-50">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-md border border-amber-100">
          <h3 className="text-xl font-bold text-amber-800 text-center mb-4">우리아이 픽업이모가 안전한 이유!</h3>
          <div className="space-y-3">
            {safetyPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">{point.title}</span>
                  <span className="text-xs text-gray-500">→ {point.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
