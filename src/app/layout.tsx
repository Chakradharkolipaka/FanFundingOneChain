import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import PageTransitionWrapper from "@/components/PageTransitionWrapper";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fan Funding – OneChain",
  description: "Support your favorite creators with NFT donations on OneChain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 pb-20 md:pb-0">
              <PageTransitionWrapper>{children}</PageTransitionWrapper>
            </main>
            <BottomNav />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
