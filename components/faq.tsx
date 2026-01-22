import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FAQ() {
  const faqs = [
    {
      question: "아이 학부모라는 검증은 어떻게 하나요?",
      answer:
        "서비스 제공자 학부모는 본인인증 절차를 거쳐 사이트에 가입합니다.\n이후 자녀의 재학증명서, 가족관계증명서, 알림장 캡처 사진 등을 업로드하면\n운영진이 확인 후 서비스 제공자로 등록됩니다.\n(민감한 개인정보는 삭제 후 업로드해 주세요)",
    },
    {
      question: "픽업 서비스는 어떻게 운영되나요?",
      answer:
        "서비스 요청자가 출발지와 도착지를 입력해 요청을 등록하면\n서비스 제공 학부모가 픽업 요청을 보냅니다.\n요청자는 제공자의 기본 정보를 확인한 후 수락할 수 있습니다.\n픽업이 시작되면 '픽업 완료 → 이동 중 → 도착 완료' 상태로 변경되며\n이동 경로가 실시간 지도에 표시됩니다.\n도착 후에는 아이가 학원이나 집으로 들어가는 사진이 업로드됩니다.",
    },
    {
      question: "픽업 중 사고가 나면 어떻게 되나요?",
      answer:
        "우리 아이 픽업이모의 픽업은, 반드시 자동차 보험에 가입된 학부모만 참여할 수 있도록 설계되어 있습니다.\n\n픽업을 제공하는 학부모는\n본인 명의 차량의 책임보험 및 종합보험에 가입된 상태여야 합니다.\n\n픽업 과정 중 발생하는 교통사고는\n기존 자동차 보험을 통해 일반적인 사고 처리 절차에 따라 처리됩니다.\n\n픽업 전·후 과정은\n픽업 시작 → 이동 중 → 도착 완료까지 단계별로 기록되어\n보호자가 확인할 수 있도록 운영됩니다.\n\n우리 아이 픽업이모는\n아이의 이동 과정을 투명하게 공유하고,\n학부모가 안심할 수 있는 환경을 만드는 데 집중한 서비스입니다.",
    },
    {
      question: "비용은 어떻게 되나요?",
      answer:
        "감사 비용은 학부모 간 합의하에 전달하는 방식을 기본으로 합니다.\n자세한 이용 방식과 비용 구조는 사전 신청자에게 우선 안내드립니다.",
    },
    {
      question: "지금 바로 이용할 수 있나요?",
      answer: "현재 일부 지역에서 시범 운영 중입니다.\n사전 신청자 수에 따라 서비스는 조기 출시될 수 있습니다.",
    },
    {
      question: "사전신청만 해도 비용이 발생하나요?",
      answer:
        "사전신청은 비용이 발생하지 않습니다.\n비상시를 대비해서 신청해 놓으시고 필요시 서비스를 빠르게 이용해 보세요!",
    },
  ]

  return (
    <section className="container mx-auto px-3 py-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-bold text-center mb-4 text-amber-900">자주 묻는 질문</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white rounded-[12px] shadow-sm border border-amber-100 px-3 hover:shadow-md transition-shadow"
            >
              <AccordionTrigger className="text-left text-sm font-semibold text-amber-900 hover:text-amber-700 py-3 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-amber-700 leading-relaxed pb-3 pt-1 whitespace-pre-line">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
