import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  target: 'serverless'
};

export default nextConfig;
