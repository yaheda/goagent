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
  title: "GoAgent — Export Prospect Discovery",
  description: "Find and manage export prospects with AI-powered research",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b px-4 py-3 flex items-center gap-6">
          <span className="font-bold tracking-tight">GoAgent</span>
          <a href="/discover" className="text-sm hover:underline">Discover</a>
          <a href="/prospects" className="text-sm hover:underline">CRM</a>
        </nav>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
