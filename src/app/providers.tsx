"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { ThemeProvider } from "@/app/theme-provider";

const queryClient = new QueryClient();

// OneChain testnet RPC — the app reads all on-chain data from here
const ONECHAIN_RPC = process.env.NEXT_PUBLIC_ONECHAIN_RPC_URL || "https://rpc-testnet.onelabs.cc:443";

const { networkConfig } = createNetworkConfig({
  testnet: {
    url: ONECHAIN_RPC,
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
          <WalletProvider
            autoConnect
            // Accept wallets on OneChain testnet (chain: 1bd5c965)
            // preferredWallets tells dapp-kit to prioritise One Wallet
            preferredWallets={["One Wallet"]}
          >
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
