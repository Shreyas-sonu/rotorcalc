import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every signed-in page reads the session per request, so the classic rendering model is used
  // rather than Cache Components.
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
