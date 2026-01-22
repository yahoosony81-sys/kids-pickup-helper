"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, Car, User } from "lucide-react"
import { SignedIn, SignedOut } from "@clerk/nextjs"

export function BottomNav() {
    const pathname = usePathname()

    const navItems = [
        { href: "/", icon: Home, label: "홈" },
        { href: "/pickup-requests", icon: FileText, label: "픽업요청" },
        { href: "/trips", icon: Car, label: "픽업제공" },
        { href: "/my", icon: User, label: "내정보" },
    ]

    return (
        <>
            <SignedIn>
                <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
                    <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                            ? "text-amber-600"
                                            : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    <Icon className="h-6 w-6 mb-1" />
                                    <span className="text-xs font-medium">{item.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                </nav>
            </SignedIn>
            <SignedOut>
                {/* 로그인 전에는 하단 네비게이션 숨김 */}
            </SignedOut>
        </>
    )
}
