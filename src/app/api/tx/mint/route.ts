import { NextRequest, NextResponse } from "next/server";
import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import { fromBase64 } from "@onelabs/sui/utils";

const RPC_URL = process.env.NEXT_PUBLIC_ONECHAIN_RPC_URL || "https://rpc-testnet.onelabs.cc:443";
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID!;

function getKeypair(): Ed25519Keypair {
  // Prefer private key (deployer key that deployed the contract)
  const b64Key = process.env.ONECHAIN_PRIVATE_KEY;
  if (b64Key) {
    const raw = fromBase64(b64Key);
    // Skip first byte (scheme flag) if present
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
    const { name, description, metadataUrl, mediaType, watchPrice, senderAddress } = body;

    if (!name || !description || !metadataUrl || !senderAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = new SuiClient({ url: RPC_URL });
    const keypair = getKeypair();

    const tx = new Transaction();

    if (mediaType === "video") {
      const priceInMist = Math.floor(parseFloat(watchPrice || "0") * 1e9);
      tx.moveCall({
        target: `${PACKAGE_ID}::nft_donation::mint_video_nft`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.pure.string(name),
          tx.pure.string(description),
          tx.pure.string(metadataUrl),
          tx.pure.u64(priceInMist),
        ],
      });
    } else {
      tx.moveCall({
        target: `${PACKAGE_ID}::nft_donation::mint_nft`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.pure.string(name),
          tx.pure.string(description),
          tx.pure.string(metadataUrl),
        ],
      });
    }

    // Sign with deployer keypair and execute on testnet
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true, showObjectChanges: true },
    });

    return NextResponse.json({
      success: true,
      digest: result.digest,
      effects: result.effects,
    });
  } catch (error: any) {
    console.error("Mint API error:", error);
    return NextResponse.json(
      { error: error.message || "Transaction failed" },
      { status: 500 }
    );
  }
}
