import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@supabase/supabase-js", "openai", "ws"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
  async rewrites() {
    return [
      { source: "/search", destination: "/api/search" },
      { source: "/suggest", destination: "/api/search?mode=suggest" },
    ];
  },
};

export default nextConfig;
