import { NextRequest, NextResponse } from "next/server";
import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import { fromBase64 } from "@onelabs/sui/utils";

const RPC_URL = process.env.NEXT_PUBLIC_ONECHAIN_RPC_URL || "https://rpc-testnet.onelabs.cc:443";
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

function resolveIpfsUrl(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("http")) return uri;
  const cid = uri.replace("ipfs://", "");
  return `${IPFS_GATEWAY}${cid}`;
}

/** Returns true if the URL looks like a direct video file, not a metadata JSON */
function isVideoUrl(url: string): boolean {
  if (!url) return false;
  // Explicit video extensions
  if (/\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(url)) return true;
  // IPFS gateway URLs without json/metadata in path — likely binary media
  if (
    /gateway\.pinata\.cloud|ipfs\.io|cloudflare-ipfs\.com|nftstorage\.link/i.test(url) &&
    !/\.(json|txt)(\?.*)?$/i.test(url) &&
    !/metadata|manifest/i.test(url)
  ) {
    return true;
  }
  return false;
}

function getKeypair(): Ed25519Keypair {
  const b64Key = process.env.ONECHAIN_PRIVATE_KEY;
  if (b64Key) {
    const raw = fromBase64(b64Key);
    const secret = raw.length === 33 ? raw.slice(1) : raw;
    return Ed25519Keypair.fromSecretKey(secret);
  }

  const mnemonic = process.env.ONECHAIN_MNEMONIC;
  if (mnemonic) {
    return Ed25519Keypair.deriveKeypair(mnemonic);
  }

  throw new Error("ONECHAIN_MNEMONIC or ONECHAIN_PRIVATE_KEY must be set. Add them in Vercel Environment Variables.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nftObjectId, watchPrice, senderAddress, videoHint } = body;

    if (!nftObjectId || watchPrice == null || !senderAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = new SuiClient({ url: RPC_URL });
    const keypair = getKeypair();

    // Fetch NFT object to get the token_uri (video URL) and name
    const nftObj = await client.getObject({
      id: nftObjectId,
      options: { showContent: true },
    });
    const fields = (nftObj.data?.content as any)?.fields;
    const tokenUri: string = fields?.token_uri || "";
    const nftName: string = fields?.name || "Video NFT";

    // Parse metadataUrl → fetch metadata JSON → get animation_url (actual .mp4)
    let videoUrl = "";
    const metadataUrl = resolveIpfsUrl(tokenUri);

    try {
      const metaRes = await fetch(metadataUrl, { signal: AbortSignal.timeout(8000) });
      if (metaRes.ok) {
        const contentType = metaRes.headers.get("content-type") || "";
        if (contentType.includes("video/") || contentType.includes("application/octet-stream")) {
          // tokenUri IS the video file directly
          videoUrl = metadataUrl;
        } else {
          // Treat as metadata JSON
          const meta = await metaRes.json().catch(() => null);
          if (meta) {
            // Priority: animation_url > video_url > media_url > image (legacy video NFTs)
            const candidates = [
              meta.animation_url,
              meta.video_url,
              meta.media_url,
              // Legacy: old NFTs stored video in image field
              meta.image,
            ].filter(Boolean) as string[];

            for (const candidate of candidates) {
              const resolved = resolveIpfsUrl(candidate);
              if (isVideoUrl(resolved)) {
                videoUrl = resolved;
                break;
              }
            }

            // Still no video URL — log metadata for debugging
            if (!videoUrl) {
              console.warn("[pay] No video URL found in metadata:", JSON.stringify(meta).slice(0, 300));
            }
          }
        }
      }
    } catch (err) {
      console.warn("[pay] Metadata fetch failed:", err);
    }

    // Final fallback: if nothing resolved, use tokenUri directly (may be a direct video URL)
    if (!videoUrl) {
      if (isVideoUrl(metadataUrl)) {
        videoUrl = metadataUrl;
      } else {
        // Last resort: use as-is and let the client handle it
        videoUrl = metadataUrl;
        console.warn("[pay] Could not resolve video URL, falling back to tokenUri:", tokenUri);
      }
    }

    console.log("[pay] Resolved videoUrl:", videoUrl, "from tokenUri:", tokenUri);

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(watchPrice)]);
    tx.moveCall({
      target: `${PACKAGE_ID}::pay_per_view::pay_to_watch`,
      arguments: [
        tx.object(nftObjectId),
        coin,
        tx.object("0x6"), // Clock object
      ],
    });

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true },
    });

    // Verify tx succeeded on-chain
    const status = result.effects?.status?.status;
    if (status !== "success") {
      const errMsg = result.effects?.status?.error || "Transaction failed on-chain";
      console.error("pay_to_watch tx failed:", errMsg, "digest:", result.digest);
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    console.log("pay_to_watch success, digest:", result.digest, "videoUrl:", videoUrl);

    return NextResponse.json({
      success: true,
      digest: result.digest,
      videoUrl,
      nftName,
    });
  } catch (error: any) {
    console.error("Pay-to-watch API error:", error);
    return NextResponse.json(
      { error: error.message || "Transaction failed" },
      { status: 500 }
    );
  }
}
