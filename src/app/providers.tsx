"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@onelabs/dapp-kit";
import { getFullnodeUrl } from "@onelabs/sui/client";
import { ThemeProvider } from "@/app/theme-provider";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider
          networks={{
            testnet: { url: getFullnodeUrl("testnet") },
            mainnet: { url: getFullnodeUrl("mainnet") },
          }}
          defaultNetwork="testnet"
        >
          <WalletProvider autoConnect>
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
