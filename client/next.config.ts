import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Bu dosyanın bulunduğu klasör = client proje kökü (üst dizindeki başka lockfile Turbopack’i şaşırmesin) */
const clientRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: clientRoot,
  },
  async rewrites() {
    const isVercel = process.env.VERCEL === "1";
    const apiUrl = isVercel
      ? "http://78.186.172.108:3201/api/:path*"
      : "http://127.0.0.1:3201/api/:path*";

    return [
      { source: "/api/:path*", destination: apiUrl },
    ];
  },
};

export default nextConfig;
