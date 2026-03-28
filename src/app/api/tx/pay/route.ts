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
    const { nftObjectId, watchPrice, senderAddress } = body;

    if (!nftObjectId || !watchPrice || !senderAddress) {
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
    let videoUrl = resolveIpfsUrl(tokenUri);
    try {
      const metaRes = await fetch(videoUrl, { signal: AbortSignal.timeout(8000) });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        // Pinata metadata format: { animation_url, image, name, description }
        const rawVideo = meta.animation_url || meta.video_url || meta.media_url || "";
        if (rawVideo) videoUrl = resolveIpfsUrl(rawVideo);
      }
    } catch {
      // If metadata fetch fails, use the tokenUri directly as video url
    }

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
