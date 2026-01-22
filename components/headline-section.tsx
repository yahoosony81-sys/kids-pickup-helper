export function HeadlineSection() {
  return (
    <section className="min-h-[45vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-6 py-8 shadow-lg">
          <h1 className="font-bold text-white drop-shadow-lg leading-tight" style={{ fontSize: "34px" }}>
            우리아이 안전한 하교길,
            <br />
            같은 학교 학부모가 함께 합니다
          </h1>

          <div className="mt-6 space-y-2 flex flex-col items-center">
            <p className="text-white/90 text-base flex items-center gap-2">
              <span className="text-green-400">✔</span> 같은 학교 학부모만 참여
            </p>
            <p className="text-white/90 text-base flex items-center gap-2">
              <span className="text-green-400">✔</span> 실시간 이동 확인
            </p>
            <p className="text-white/90 text-base flex items-center gap-2">
              <span className="text-green-400">✔</span> 도착 사진 인증
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
