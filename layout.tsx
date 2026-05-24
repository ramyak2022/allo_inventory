// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Multi-warehouse inventory and reservation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b bg-white sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-indigo-600">Allo</span>
            <span className="text-gray-400 text-sm">Inventory</span>
          </div>
        </nav>
        <main className="min-h-screen bg-gray-50">{children}</main>
      </body>
    </html>
  );
}
