import type { NextConfig } from "next";

// The editor runs entirely in the browser; deploy out/ to any static host.
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
};

export default config;
