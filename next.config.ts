import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components / PPR add constraints that bring no value to a
  // client-rendered WebGL app with static content routes. Keep it simple.
  cacheComponents: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
