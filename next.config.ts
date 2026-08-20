import type { NextConfig } from "next";

process.env.NEXT_TELEMETRY_DISABLED = "1";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["resend"],
};

export default nextConfig;
