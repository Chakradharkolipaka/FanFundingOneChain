"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { ThemeProvider } from "@/app/theme-provider";

const queryClient = new QueryClient();

// OneChain network configuration
// Replace with OneChain's actual RPC URL when available
const networks = {
  onechain: {
    url: process.env.NEXT_PUBLIC_ONECHAIN_RPC_URL || "https://rpc.testnet.onechain.fun",
  },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networks} defaultNetwork="onechain">
          <WalletProvider autoConnect>
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
