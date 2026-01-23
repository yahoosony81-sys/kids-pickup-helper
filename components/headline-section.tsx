export function HeadlineSection() {
  return (
    <section className="flex items-start justify-center px-4 pt-12 pb-4">
      <div className="w-full max-w-sm mx-auto text-center">
        <div className="inline-block bg-black/40 backdrop-blur-md rounded-2xl px-6 py-5 shadow-xl border border-white/10">
          <h1 className="text-white font-bold text-xl sm:text-2xl mb-2 leading-tight drop-shadow-md">
            안전한 하교길,<br />
            학부모가 함께해요
          </h1>
          <p className="text-white/90 font-medium leading-relaxed text-sm sm:text-base">
            <span className="font-bold text-amber-300">&apos;우리 아이 픽업이모&apos;</span>는<br />
            같은 학교 학부모끼리 연결되어<br />
            아이 이동을 안전하게 돕는 서비스입니다.
          </p>
        </div>
      </div>
    </section>
  )
}
