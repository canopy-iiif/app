import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProduction ? process.env.NEXT_PUBLIC_BASE_PATH : "",
  assetPrefix: isProduction ? process.env.NEXT_PUBLIC_URL : "",
  publicRuntimeConfig: {
    url: isProduction ? process.env.NEXT_PUBLIC_URL : "",
  },
};

export default nextConfig;
