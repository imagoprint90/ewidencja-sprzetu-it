import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DemoStoreProvider } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Ewidencja sprzętu IT",
  description: "System inwentaryzacji sprzętu IT firmy",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        <DemoStoreProvider>
          <AppShell>{children}</AppShell>
        </DemoStoreProvider>
      </body>
    </html>
  );
}
