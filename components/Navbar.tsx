"use client";

import { SignedOut, SignInButton, SignedIn, useUser, SignOutButton } from "@clerk/nextjs";
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
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex justify-between items-center p-4 gap-4 h-16 max-w-7xl mx-auto">
        <Link href="/" className="text-2xl font-bold">
          우리아이 픽업이모
        </Link>
        <div className="flex gap-4 items-center">
          <SignedIn>
            <Link href="/pickup-requests">
              <Button variant="ghost">픽업 요청</Button>
            </Link>
            <Link href="/trips">
              <Button variant="ghost">픽업제공</Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button>로그인</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-4">
              <SignOutButton>
                <Button variant="outline" size="sm">로그아웃</Button>
              </SignOutButton>
              <ProfileButton />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
