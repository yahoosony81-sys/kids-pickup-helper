"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2, HandHelping, Car } from "lucide-react"


type ApplicationType = "REQUEST" | "PROVIDE" | null

// SHA256 해싱 함수 (메타 표준: trim -> lowercase -> hash)
const sha256Hash = async (message: string): Promise<string> => {
  // 1. 앞뒤 공백 제거 (trim)
  // 2. 소문자 변환 (lowercase)
  // 3. 내부 공백 제거
  const normalized = message.trim().toLowerCase().replace(/\s+/g, "")
  const msgBuffer = new TextEncoder().encode(normalized)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashedValue = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashedValue
}

// 전화번호 정규화 (메타 표준: 숫자만, 국가코드 포함)
const normalizePhone = (phone: string): string => {
  // 숫자만 추출
  let digits = phone.replace(/[^\d]/g, "")

  // 한국 전화번호 처리: 010으로 시작하면 82 국가코드 추가
  if (digits.startsWith("010")) {
    digits = "82" + digits.slice(1) // 010 -> 8210
  } else if (digits.startsWith("0")) {
    digits = "82" + digits.slice(1) // 0xx -> 82xx
  } else if (!digits.startsWith("82")) {
    digits = "82" + digits // 국가코드 없으면 추가
  }

  return digits
}

// 메타 픽셀 고급 매칭으로 Lead 이벤트 발생
const trackLeadEventWithAdvancedMatching = async (email: string, phone?: string) => {
  if (typeof window !== "undefined" && window.fbq) {
    try {
      // 이메일 정규화 및 해싱 (필수)
      const normalizedEmail = email.trim().toLowerCase()
      const hashedEmail = await sha256Hash(normalizedEmail)

      // 고급 매칭 데이터 객체 (해싱된 값 사용)
      const advancedMatchingData: { em: string; ph?: string } = {
        em: hashedEmail,
      }

      // 휴대폰번호가 있는 경우에만 정규화 및 해싱
      if (phone && phone.trim()) {
        const normalizedPhone = normalizePhone(phone)
        if (normalizedPhone && normalizedPhone.length >= 10) {
          const hashedPhone = await sha256Hash(normalizedPhone)
          advancedMatchingData.ph = hashedPhone
        }
      }

      // fbq.push를 사용하여 사용자 데이터 설정 (init 재호출 대신)
      // 이미 초기화된 픽셀에 사용자 데이터 업데이트
      if (typeof window.fbq === "function") {
        // 사용자 데이터 설정
        window.fbq("init", "672769682470185", advancedMatchingData)

        // Lead 이벤트 발생 (user_data 포함)
        window.fbq("track", "Lead", {
          eventID: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      }

    } catch (error) {
      // 에러 발생 시에도 기본 Lead 이벤트는 발생
      if (window.fbq) {
        window.fbq("track", "Lead")
      }
    }
  }
}

const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/[^\d]/g, "")
  if (numbers.length <= 3) return numbers
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
}

export function PreRegister({ isOpen, setIsOpen }: { isOpen?: boolean; setIsOpen?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [applicationType, setApplicationType] = useState<ApplicationType>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [kakaoId, setKakaoId] = useState("")
  const [phone, setPhone] = useState("")
  const [region, setRegion] = useState("")
  const [childSchoolName, setChildSchoolName] = useState("")

  // 제출된 이메일/전화번호 저장 (고급 매칭용)
  const [submittedEmail, setSubmittedEmail] = useState("")
  const [submittedPhone, setSubmittedPhone] = useState("")

  const dialogOpen = isOpen !== undefined ? isOpen : internalOpen
  const setDialogOpen = setIsOpen !== undefined ? setIsOpen : setInternalOpen

  // 제출 완료 시 고급 매칭으로 Lead 이벤트 발생
  useEffect(() => {
    if (isSubmitted && submittedEmail) {
      trackLeadEventWithAdvancedMatching(submittedEmail, submittedPhone)
    }
  }, [isSubmitted, submittedEmail, submittedPhone])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = "이름을 입력해주세요"
    }

    if (!email.trim()) {
      newErrors.email = "이메일을 입력해주세요"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "올바른 이메일 형식을 입력해주세요"
    }

    if (!kakaoId.trim()) {
      newErrors.kakaoId = "카톡 아이디를 입력해주세요"
    }

    if (phone.trim() && !/^\d{3}-\d{4}-\d{4}$/.test(phone)) {
      newErrors.phone = "올바른 휴대폰번호 형식을 입력해주세요"
    }

    if (!region.trim()) {
      newErrors.region = "지역을 입력해주세요"
    }

    if (!childSchoolName.trim()) {
      newErrors.childSchoolName = "자녀 학교 이름을 입력해주세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const googleScriptUrl =
        "https://script.google.com/macros/s/AKfycbzyBzBHOj-MkeqtZIGspZ65ynmuDN0ELWVxGDbxguC6UmYHZfevN3J6STXWIsdiM0Mfbg/exec"

      const submittedAt = new Date().toLocaleString("ko-KR", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })

      const data = {
        제출시간: submittedAt,
        신청유형: applicationType === "REQUEST" ? "요청" : "제공",
        이름: name.trim(),
        이메일: email.trim(),
        "카톡 아이디": kakaoId.trim(),
        휴대폰번호: phone.trim(),
        지역: region.trim(),
        자녀학교이름: childSchoolName.trim(),
      }

      await fetch(googleScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(data),
      })

      // 고급 매칭을 위해 제출된 이메일/전화번호 저장
      setSubmittedEmail(email.trim())
      setSubmittedPhone(phone.trim())

      setIsSubmitted(true)
    } catch (error) {
      console.error("등록 오류:", error)
      setErrors({ submit: "등록 중 오류가 발생했습니다. 다시 시도해주세요." })
    } finally {
      setIsLoading(false)
    }
  }

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const resetForm = () => {
    setDialogOpen(false)
    setIsSubmitted(false)
    setErrors({})
    setApplicationType(null)
    setName("")
    setEmail("")
    setKakaoId("")
    setPhone("")
    setRegion("")
    setChildSchoolName("")
    setSubmittedEmail("")
    setSubmittedPhone("")
  }

  const openDialog = () => {
    setDialogOpen(true)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhone(formatted)
    clearError("phone")
  }

  const getFormTitle = () => {
    if (applicationType === "REQUEST") return "서비스 요청 사전신청"
    if (applicationType === "PROVIDE") return "서비스 제공(투잡) 사전신청"
    return "사전 신청하기"
  }

  return (
    <>
      <section className="px-4 py-10 bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="flex justify-center gap-2 text-xl mb-2">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
              💛
            </span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
              😊
            </span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
              💛
            </span>
          </div>

          <Button
            size="default"
            onClick={openDialog}
            className="h-11 px-6 text-sm rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] font-bold"
          >
            무료로 사전신청 하고 필요시 우선 서비스 안내받기
          </Button>

          <div className="space-y-2 pt-2 text-left max-w-xs mx-auto">
            <p className="text-amber-700 text-xs leading-relaxed">
              1. 사전신청만 진행되며, 실제 이용 전 충분한 안내 후 진행됩니다.
            </p>
            <p className="text-amber-700 text-xs leading-relaxed">
              2. 사전 신청 시 작성한 개인정보는 서비스 출시 안내 및 정책 안내 목적 외에는 사용되지 않습니다.
            </p>
            <p className="text-amber-700 text-xs leading-relaxed">
              3. 사전 신청자는 서비스 출시 후 가장 먼저 매칭 서비스가 제공됩니다.
            </p>
          </div>

          <div className="flex justify-center gap-2 text-lg pt-2">
            <span>❤️</span>
            <span>💚</span>
            <span>💙</span>
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={resetForm}>
        <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto">
          {!isSubmitted ? (
            <>
              {applicationType === null ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-amber-900 text-center">신청 유형 선택</DialogTitle>
                    <p className="text-amber-600 text-xs text-center mt-2">어떤 서비스를 원하시나요?</p>
                  </DialogHeader>
                  <div className="space-y-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setApplicationType("REQUEST")}
                      className="w-full p-4 rounded-xl border-2 border-amber-200 hover:border-amber-500 hover:bg-amber-50 transition-all duration-200 flex items-center gap-3 text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <HandHelping className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-900 text-sm">서비스 요청 사전신청</p>
                        <p className="text-amber-600 text-xs mt-1">우리 아이 픽업을 부탁하고 싶어요</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setApplicationType("PROVIDE")}
                      className="w-full p-4 rounded-xl border-2 border-sky-200 hover:border-sky-500 hover:bg-sky-50 transition-all duration-200 flex items-center gap-3 text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                        <Car className="w-6 h-6 text-sky-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sky-900 text-sm">서비스 제공(투잡) 사전신청</p>
                        <p className="text-sky-600 text-xs mt-1">제가 안전하게 픽업해 드릴게요</p>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                /* Step 2: 신청 폼 */
                <>
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setApplicationType(null)}
                        className="text-amber-600 hover:text-amber-800 text-xs"
                      >
                        ← 뒤로
                      </button>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${applicationType === "REQUEST" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                          }`}
                      >
                        {applicationType === "REQUEST" ? "서비스 요청" : "서비스 제공"}
                      </span>
                    </div>
                    <DialogTitle className="text-lg font-bold text-amber-900 text-center mt-2">
                      {getFormTitle()}
                    </DialogTitle>
                    <p className="text-amber-600 text-xs text-center mt-2">
                      ※ 사전신청만 진행되며, 실제 이용 전 충분한 안내 후 진행됩니다.
                    </p>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-3 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-xs">
                        이름 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="홍길동"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value)
                          clearError("name")
                        }}
                        className={`rounded-[10px] h-9 text-sm ${errors.name ? "border-red-500" : ""}`}
                      />
                      {errors.name && <p className="text-red-500 text-[10px]">{errors.name}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">
                        이메일 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          clearError("email")
                        }}
                        className={`rounded-[10px] h-9 text-sm ${errors.email ? "border-red-500" : ""}`}
                      />
                      {errors.email && <p className="text-red-500 text-[10px]">{errors.email}</p>}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="kakaoId" className="text-xs">
                          카톡 아이디 <span className="text-red-500">*</span>
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-amber-600 hover:text-amber-800 text-xs underline">
                                (카톡아이디 찾는법?)
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px] text-xs">
                              <p>카톡아이디 찾는법: 카카오톡 → 설정 → 프로필 관리 → 카카오톡 ID</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="kakaoId"
                        placeholder="예: mykakao123"
                        value={kakaoId}
                        onChange={(e) => {
                          setKakaoId(e.target.value)
                          clearError("kakaoId")
                        }}
                        className={`rounded-[10px] h-9 text-sm ${errors.kakaoId ? "border-red-500" : ""}`}
                      />
                      {errors.kakaoId && <p className="text-red-500 text-[10px]">{errors.kakaoId}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs">
                        휴대폰번호(선택사항)
                        <span className="text-gray-500 text-[10px] ml-1">
                          - 보다 빠른 서비스안내를 받을 수 있습니다
                        </span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="예: 010-1234-5678"
                        value={phone}
                        onChange={handlePhoneChange}
                        className={`rounded-[10px] h-9 text-sm ${errors.phone ? "border-red-500" : ""}`}
                      />
                      {errors.phone && <p className="text-red-500 text-[10px]">{errors.phone}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="region" className="text-xs">
                        지역 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="region"
                        placeholder="예: 서울시 강남구"
                        value={region}
                        onChange={(e) => {
                          setRegion(e.target.value)
                          clearError("region")
                        }}
                        className={`rounded-[10px] h-9 text-sm ${errors.region ? "border-red-500" : ""}`}
                      />
                      {errors.region && <p className="text-red-500 text-[10px]">{errors.region}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="childSchoolName" className="text-xs">
                        자녀학교 이름 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="childSchoolName"
                        placeholder="예: 소나무 초등학교"
                        value={childSchoolName}
                        onChange={(e) => {
                          setChildSchoolName(e.target.value)
                          clearError("childSchoolName")
                        }}
                        className={`rounded-[10px] h-9 text-sm ${errors.childSchoolName ? "border-red-500" : ""}`}
                      />
                      {errors.childSchoolName && <p className="text-red-500 text-[10px]">{errors.childSchoolName}</p>}
                    </div>

                    {errors.submit && <p className="text-red-500 text-xs text-center">{errors.submit}</p>}

                    <Button
                      type="submit"
                      className="w-full h-10 text-sm rounded-[10px] bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          등록 중...
                        </>
                      ) : (
                        "신청 완료"
                      )}
                    </Button>
                  </form>
                </>
              )}
            </>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="text-4xl mb-2">🎉</div>
              <DialogTitle className="text-lg font-bold text-amber-900">웨이팅 리스트 등록 완료!</DialogTitle>
              <p className="text-amber-700 text-sm leading-relaxed">출시되면 가장 먼저 알려드릴게요.</p>
              <Button onClick={resetForm} className="mt-4 rounded-[10px] bg-amber-500 hover:bg-amber-600 text-sm">
                닫기
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
