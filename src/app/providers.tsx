"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { ThemeProvider } from "@/app/theme-provider";

const queryClient = new QueryClient();

// OneChain testnet — chain ID: 1bd5c965
// One Wallet connects to this chain by its RPC URL
const ONECHAIN_RPC = process.env.NEXT_PUBLIC_ONECHAIN_RPC_URL || "https://rpc-testnet.onelabs.cc:443";

const { networkConfig } = createNetworkConfig({
  // Key must match what One Wallet reports as its network
  "onechain-testnet": {
    url: ONECHAIN_RPC,
  },
  // Keep "testnet" alias so app internals still work
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
