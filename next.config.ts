import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Lets a second local tab at 127.0.0.1 load the dev server, e.g. a student and a professor side by side.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
