"use client";

import { useEffect, useState } from "react";
import { useSuiClient, useCurrentAccount, useCurrentWallet } from "@mysten/dapp-kit";
import NFTCard from "@/components/NFTCard";
import SkeletonCard from "@/components/SkeletonCard";
import { PACKAGE_ID, REGISTRY_ID } from "@/constants";

interface NFTData {
  objectId: string;
  tokenId: number;
  name: string;
  description: string;
  tokenUri: string;
  mediaType: string;
  watchPrice: number;
  creator: string;
  totalDonated: number;
}

const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://nftstorage.link/ipfs/",
];

function resolveIpfsUrl(uri: string): string {
  if (!uri) return "/placeholder.png";
  if (uri.startsWith("http")) return uri;
  const cid = uri.replace("ipfs://", "");
  return `${IPFS_GATEWAYS[0]}${cid}`;
}

export default function HomePage() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { currentWallet, connectionStatus } = useCurrentWallet();
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDonations, setTotalDonations] = useState(0);
  const [totalNFTs, setTotalNFTs] = useState(0);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  // Check if connected wallet is on OneChain testnet (chain: 1bd5c965)
  useEffect(() => {
    if (connectionStatus !== "connected" || !currentWallet) {
      setWrongNetwork(false);
      return;
    }
    // dapp-kit exposes the chain the wallet is currently on
    const chain = (currentWallet as any)?.chains?.[0] || "";
    // OneChain testnet chain id is "1bd5c965", dapp-kit formats as "onechain:1bd5c965"
    if (chain && !chain.includes("1bd5c965")) {
      setWrongNetwork(true);
    } else {
      setWrongNetwork(false);
    }
  }, [currentWallet, connectionStatus]);

  useEffect(() => {
    async function fetchNFTs() {
      try {
        setLoading(true);

        // Query NFTMinted events to discover all minted NFTs
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::nft_donation::NFTMinted`,
          },
          order: "descending",
          limit: 50,
        });

        const nftList: NFTData[] = [];
        let totalDonated = 0;

        // Process events in parallel for speed
        const results = await Promise.allSettled(
          events.data.map(async (event) => {
            const parsed = event.parsedJson as any;
            if (!parsed) return null;

            try {
              // Get object ID from the transaction that created the NFT
              const txData = await client.getTransactionBlock({
                digest: event.id.txDigest,
                options: { showObjectChanges: true },
              });

              const created = txData.objectChanges?.find(
                (c: any) =>
                  c.type === "created" &&
                  c.objectType?.includes("FanNFT")
              ) as any;

              if (!created) return null;

              // Fetch the NFT object for current state (donation total etc.)
              const nftObj = await client.getObject({
                id: created.objectId,
                options: { showContent: true },
              });

              if (!nftObj.data?.content) return null;

              const fields = (nftObj.data.content as any)?.fields;
              if (!fields) return null;

              // total_donated is Balance<OCT> — serialized as string or nested {value: string}
              let donated = 0;
              if (typeof fields.total_donated === "string") {
                donated = Number(fields.total_donated) || 0;
              } else if (fields.total_donated?.fields?.value) {
                donated = Number(fields.total_donated.fields.value) || 0;
              } else if (typeof fields.total_donated === "number") {
                donated = fields.total_donated;
              }

              return {
                objectId: created.objectId,
                tokenId: Number(fields.token_id),
                name: fields.name,
                description: fields.description,
                tokenUri: fields.token_uri,
                mediaType: fields.media_type,
                watchPrice: Number(fields.watch_price) || 0,
                creator: fields.creator,
                totalDonated: donated,
              } as NFTData;
            } catch (err) {
              console.warn("Failed to fetch NFT from event:", err);
              return null;
            }
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            nftList.push(result.value);
            totalDonated += result.value.totalDonated;
          }
        }

        setNfts(nftList);
        setTotalDonations(totalDonated);
        setTotalNFTs(nftList.length);
      } catch (err) {
        console.error("Failed to fetch NFTs:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNFTs();
  }, [client]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">

      {/* Wrong network warning */}
      {wrongNetwork && (
        <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4 text-yellow-500 text-sm flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold">Wrong Network Detected</p>
            <p className="mt-1">
              Your One Wallet is not connected to <strong>OneChain Testnet</strong>.
              Please open One Wallet → Settings → Network → select <strong>Testnet</strong>.
              The RPC URL is: <code className="bg-yellow-500/20 px-1 rounded">https://rpc-testnet.onelabs.cc:443</code>
            </p>
          </div>
        </div>
      )}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          🎨 Fan Funding on <span className="text-primary">OneChain</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Support your favorite creators by donating OCT to their NFTs. Creators
          mint, fans donate — all on-chain.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total NFTs" value={totalNFTs} />
        <StatCard label="Total Donated" value={`${(totalDonations / 1e9).toFixed(4)} OCT`} />
        <StatCard label="Network" value="OneChain" />
        <StatCard label="Token" value="OCT" />
      </div>

      {/* NFT Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">🖼️ All Creator NFTs</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No NFTs minted yet.</p>
            <p className="text-sm mt-1">Be the first to mint!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nfts.map((nft) => (
              <NFTCard
                key={nft.objectId}
                objectId={nft.objectId}
                tokenId={nft.tokenId}
                name={nft.name}
                description={nft.description}
                imageUrl={resolveIpfsUrl(nft.tokenUri)}
                mediaType={nft.mediaType}
                watchPrice={nft.watchPrice}
                creator={nft.creator}
                totalDonated={nft.totalDonated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1">{String(value)}</p>
    </div>
  );
}
