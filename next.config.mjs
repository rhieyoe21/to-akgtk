import { networkInterfaces } from "node:os";

/** @type {import('next').NextConfig} */
const lanOrigins = process.env.NODE_ENV === "production" ? [] : [
  ...Object.values(networkInterfaces()).flatMap((interfaces) => (interfaces || [])
    .filter((address) => !address.internal && address.family === "IPv4")
    .map((address) => address.address)),
  ...(process.env.DEV_ALLOWED_ORIGINS || "").split(",").map((host) => host.trim()).filter(Boolean)
];

const nextConfig = {
  poweredByHeader: false,
  ...(process.env.NODE_ENV !== "production" ? { allowedDevOrigins: [...new Set(lanOrigins)] } : {}),
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ]
    }];
  }
};

export default nextConfig;
