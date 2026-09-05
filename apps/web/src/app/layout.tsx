import "../polyfills";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RH Creator Capital",
  description: "Terminal for social capital trading",
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground text-[15px] leading-relaxed`}
      >
        <WalletContextProvider>
          <Toaster position="bottom-right" toastOptions={{ className: 'dark:bg-[#1A1F2B] dark:text-white' }} />
          <div className="flex flex-col min-h-screen">
            <TopNav />
            <main className="flex-grow w-full px-4 sm:px-8 lg:px-12 py-6 pb-24 md:pb-6">
              {children}
            </main>
            <Footer />
            <BottomNav />
          </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
