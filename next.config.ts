import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer ma natywne/WASM zależności (m.in. layout Yoga) — traktujemy
  // je jako pakiet zewnętrzny zamiast bundlować, żeby generowanie PDF działało
  // niezawodnie w środowisku serverless (Vercel).
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
