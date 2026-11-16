import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Avoid host-arch sharp native binary; Pi is aarch64.
  images: { unoptimized: true },
};

export default nextConfig;
