import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer ma natywne/WASM zależności (m.in. layout Yoga) — traktujemy
  // je jako pakiet zewnętrzny zamiast bundlować, żeby generowanie PDF działało
  // niezawodnie w środowisku serverless (Vercel).
  serverExternalPackages: ["@react-pdf/renderer"],
  // Pliki (faktury, skany protokołów, załączniki ticketów) jadą do akcji serwerowych jako base64
  // (+33%). Domyślny limit akcji to 1 MB — większy PDF był odrzucany bez komunikatu. 4 MB mieści
  // plik do ok. 3 MB; wyżej nie ma sensu, bo Vercel i tak tnie żądania do 4,5 MB.
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
