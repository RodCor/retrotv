import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for the Docker image.
  output: "standalone",
  images: {
    // Avatar imaging is served by the emulator / habbo-imaging host.
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
