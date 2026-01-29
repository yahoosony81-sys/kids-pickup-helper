"use client";

import { SignedOut, SignInButton, SignedIn, useUser } from "@clerk/nextjs";
import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ProfileButton = () => {
  const { user } = useUser();

  if (!user) return null;

  return (
    <Link href="/my">
      <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
        <AvatarImage src={user.imageUrl} alt={user.fullName || "Profile"} />
        <AvatarFallback>
          {user.fullName?.charAt(0) || user.firstName?.charAt(0) || "U"}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
};

const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 safe-area-top">
      <div className="flex justify-between items-center px-4 h-14 max-w-md mx-auto">
        <Link href="/" className="flex items-center">
          <span className="text-lg font-bold text-amber-600 whitespace-nowrap">
            우리아이 픽업이모
          </span>
        </Link>
        <div className="flex gap-2 items-center">
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                로그인
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <ProfileButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
};

export default Navbar;