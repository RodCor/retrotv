import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for the Docker image.
  output: "standalone",
  experimental: {
    // Allow furni .swf uploads (admin "create furni") through Server Actions;
    // the default body limit is 1 MB. Furni SWFs are small, 10 MB is ample.
    serverActions: { bodySizeLimit: "10mb" },
  },
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
