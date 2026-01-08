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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <FilterProvider>
          {/* CRITICAL: Sidebar must be outside of any overflow-hidden containers for mobile visibility */}
          <Sidebar />

          <div className="flex min-h-screen relative flex-col md:flex-row">
            {/* Spacer for desktop sidebar placeholder if needed, but since Sidebar is absolute/fixed it's fine */}
            <main className="flex-1 w-full relative min-h-full flex flex-col md:pl-20">
              {children}
            </main>
          </div>

          {/* Diagnostic Global Script */}
          <script dangerouslySetInnerHTML={{
            __html: `
            window.__HIKE_DIAGNOSTICS = {
              version: "${new Date().getTime()}",
              mobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false
            };
            console.log('Hike Dash Initialized:', window.__HIKE_DIAGNOSTICS);
          `}} />
        </FilterProvider>
      </body>
    </html>
  );
}
