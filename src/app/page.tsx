"use client";

import { useEffect, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
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
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDonations, setTotalDonations] = useState(0);
  const [totalNFTs, setTotalNFTs] = useState(0);

  useEffect(() => {
    async function fetchNFTs() {
      try {
        setLoading(true);

        // Fetch all FanNFT objects owned by the package (shared objects)
        const objects = await client.getOwnedObjects({
          owner: PACKAGE_ID,
          options: { showContent: true, showType: true },
        });

        // Also query dynamic fields or use queryEvents to find NFTs
        // For shared objects, we query events instead
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::nft_donation::NFTMinted`,
          },
          order: "descending",
          limit: 50,
        });

        const nftList: NFTData[] = [];
        let totalDonated = 0;

        for (const event of events.data) {
          const parsed = event.parsedJson as any;
          if (!parsed) continue;

          // Try to fetch the actual NFT object to get current donation total
          try {
            // We need to find the object ID from the event's transaction
            const tx = await client.getTransactionBlock({
              digest: event.id.txDigest,
              options: { showEffects: true, showObjectChanges: true },
            });

            const created = tx.objectChanges?.find(
              (c: any) =>
                c.type === "created" &&
                c.objectType?.includes("FanNFT")
            ) as any;

            if (created) {
              const nftObj = await client.getObject({
                id: created.objectId,
                options: { showContent: true },
              });

              const fields = (nftObj.data?.content as any)?.fields;
              if (fields) {
                const donated = Number(fields.total_donated) || 0;
                totalDonated += donated;

                nftList.push({
                  objectId: created.objectId,
                  tokenId: Number(fields.token_id),
                  name: fields.name,
                  description: fields.description,
                  tokenUri: fields.token_uri,
                  mediaType: fields.media_type,
                  watchPrice: Number(fields.watch_price) || 0,
                  creator: fields.creator,
                  totalDonated: donated,
                });
              }
            }
          } catch (err) {
            console.warn("Failed to fetch NFT object:", err);
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
      {/* Stats */}
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
