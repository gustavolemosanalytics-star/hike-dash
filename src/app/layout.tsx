import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Financial Dashboard | Hike",
  description: "Dashboard Financeiro Hike Marketing",
};

import { Sidebar } from "@/components/Sidebar";
import { FilterProvider } from "@/lib/filter-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FilterProvider>
          <div className="flex h-screen bg-background overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 w-full relative h-full overflow-hidden">
              {children}
            </main>
          </div>
        </FilterProvider>
      </body>
    </html>
  );
}
