import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
const supabaseUrl = process.env.SUPABASE_URL;

if (supabaseUrl) {
  const { protocol, hostname, port } = new URL(supabaseUrl);

  remotePatterns.push({
    protocol: protocol.replace(":", "") as "http" | "https",
    hostname,
    port,
    pathname: "/storage/v1/object/public/**"
  });
}

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb"
    }
  },
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"]
  }
};

export default nextConfig;
