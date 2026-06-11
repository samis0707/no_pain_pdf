import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow dev-mode assets to load when the dev server is accessed via the
  // LAN IP (e.g. phone testing over VPN). No effect on production builds.
  allowedDevOrigins: ["192.168.178.186"],
};

export default nextConfig;
