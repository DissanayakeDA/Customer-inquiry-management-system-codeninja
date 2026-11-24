import path from 'node:path';

/** Where the Express API runs. The browser never calls it directly; Next proxies /api/* to it. */
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const workspaceRoot = path.join(import.meta.dirname, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't generate an AGENTS.md (AI-assistant instructions) in the project on `next dev`.
  agentRules: false,
  // Keep the dev-mode indicator from covering the signed-in user's avatar in the sidebar.
  devIndicators: { position: 'bottom-right' },
  // @inquirydesk/shared is TypeScript source inside this monorepo; let Next compile it.
  transpilePackages: ['@inquirydesk/shared'],
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  // Browser → Next (same origin) → Express: the session cookie stays first-party and no CORS is needed.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
