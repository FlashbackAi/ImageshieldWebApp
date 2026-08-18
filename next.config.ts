import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the LAN load dev-only assets (HMR, /_next/*) without being
  // blocked as cross-origin requests to the dev server.
  allowedDevOrigins: ["192.168.1.11", "*.local"],
};

export default nextConfig;
