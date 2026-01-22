"use client"

import { HeadlineSection } from "@/components/headline-section"
import { ServiceCardSection } from "@/components/service-card-section"
import { MapSection } from "@/components/map-section"
import { SafetySection } from "@/components/safety-section"
import { HowToUseSection } from "@/components/how-to-use-section"
import { FAQ } from "@/components/faq"

export default function Home() {
  return (
    <div className="overflow-y-auto">
      <main>
        {/* 배경 이미지 섹션: 히어로 + 서비스 카드 */}
        <section
          className="relative bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/saas템플릿사진.png')`,
          }}
        >
          {/* SECTION 1: 불안 공감 헤드라인 */}
          <div className="relative z-10">
            <HeadlineSection />
          </div>

          {/* SECTION 2: 서비스 카드 (행동 선택) */}
          <div className="relative z-10 pb-6">
            <ServiceCardSection />
          </div>
        </section>

        <section className="bg-amber-50">
          {/* SECTION 3: 지도 예시 */}
          <MapSection />

          {/* SECTION 4: 안전 강조 섹션 */}
          <SafetySection />

          {/* SECTION 5: 서비스 이용 방법 */}
          <HowToUseSection />

          {/* SECTION 6: FAQ */}
          <FAQ />
        </section>
      </main>
    </div>
  )
}
