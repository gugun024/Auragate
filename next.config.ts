import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling native addons and Prisma internals.
  // These must be resolved from node_modules at runtime, not bundled.
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/client",
    "@prisma/adapter-better-sqlite3",
    "prisma",
  ],

  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: '/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
