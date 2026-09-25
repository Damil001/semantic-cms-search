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
  async headers() {
    return [
      {
        source: "/search/v/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/search", destination: "/api/search" },
      { source: "/suggest", destination: "/api/search?mode=suggest" },
    ];
  },
};

export default nextConfig;
