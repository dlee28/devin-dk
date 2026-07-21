import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "./TopNav";

export const metadata: Metadata = {
  title: "Internal Tools Prototype",
  description: "KYC review queue on a shared governance layer",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <TopNav />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
