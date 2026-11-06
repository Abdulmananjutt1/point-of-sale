import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Prevent Prisma/bcryptjs from being bundled on client side
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
