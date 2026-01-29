import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { hostname: "img.clerk.com" },
      { hostname: "*.supabase.co" }, // Supabase Storage signed URLs
    ],
  },
};

export default nextConfig;
