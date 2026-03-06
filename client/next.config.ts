import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const isVercel = process.env.VERCEL === "1";
    const apiUrl = isVercel
      ? "http://78.186.172.108:3201/api/:path*"
      : "http://localhost:3201/api/:path*";

    return [
      { source: "/api/:path*", destination: apiUrl },
    ];
  },
};

export default nextConfig;
