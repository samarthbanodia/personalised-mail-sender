import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so a stray lockfile elsewhere on the
  // machine doesn't get inferred as the root (silences the build warning).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
