import path from "node:path";
import { fileURLToPath } from "node:url";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321");
  } catch {
    return new URL("http://127.0.0.1:54321");
  }
})();

const origin = (u, fallback) => {
  try {
    return new URL(u).origin;
  } catch {
    return fallback;
  }
};
const isDev = process.env.NODE_ENV !== "production";
const apiOrigin = origin(process.env.NEXT_PUBLIC_API_URL, "http://127.0.0.1:4000");

/**
 * CSP: só a própria loja, a API, o Supabase e — quando houver consentimento — Google Analytics e Meta.
 * 'unsafe-inline' em scripts é exigido pelo carregamento do Next sem nonce (páginas estáticas/ISR).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseHost.origin} https://www.google-analytics.com https://*.google-analytics.com https://www.facebook.com`,
  `media-src 'self' blob: ${supabaseHost.origin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} ${supabaseHost.origin} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com${isDev ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Raiz do monorepo (evita que o Next adote um package-lock.json de fora do projeto).
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
  poweredByHeader: false,
  // Metadados sempre no <head> (sem streaming): bom para SEO, redes sociais e auditorias.
  htmlLimitedBots: /.*/,
  transpilePackages: ["@movalev/shared"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: supabaseHost.protocol.replace(":", ""),
        hostname: supabaseHost.hostname,
        port: supabaseHost.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    // www.dominio → dominio (308), derivado de NEXT_PUBLIC_SITE_URL.
    const site = origin(process.env.NEXT_PUBLIC_SITE_URL, "");
    const host = site ? new URL(site).hostname : "";
    if (!host || host === "localhost" || host.startsWith("www.")) return [];
    return [{ source: "/:path*", has: [{ type: "host", value: `www.${host}` }], destination: `${site}/:path*`, permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
