import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// Keep builds from replacing the chunks used by a running development server.
export default function nextConfig(phase) {
  return {
    reactStrictMode: true,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
}
