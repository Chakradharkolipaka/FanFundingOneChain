import { NextRequest, NextResponse } from "next/server";
import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import { fromBase64 } from "@onelabs/sui/utils";

const RPC_URL = process.env.NEXT_PUBLIC_ONECHAIN_RPC_URL || "https://rpc-testnet.onelabs.cc:443";
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;

function getKeypair(): Ed25519Keypair {
  const mnemonic = process.env.ONECHAIN_MNEMONIC;
  if (mnemonic) {
    return Ed25519Keypair.deriveKeypair(mnemonic);
  }

  const b64Key = process.env.ONECHAIN_PRIVATE_KEY;
  if (b64Key) {
    const raw = fromBase64(b64Key);
    const secret = raw.length === 33 ? raw.slice(1) : raw;
    return Ed25519Keypair.fromSecretKey(secret);
  }

  throw new Error("ONECHAIN_MNEMONIC or ONECHAIN_PRIVATE_KEY must be set");
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
    });
  } catch (error: any) {
    console.error("Pay-to-watch API error:", error);
    return NextResponse.json(
      { error: error.message || "Transaction failed" },
      { status: 500 }
    );
  }
}
