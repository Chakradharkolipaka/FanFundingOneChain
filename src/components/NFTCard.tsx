"use client";

import { useState } from "react";
import Image from "next/image";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Heart, Video, Eye, Loader2, ExternalLink } from "lucide-react";
import Confetti from "react-confetti";

interface NFTCardProps {
  objectId: string;
  tokenId: number;
  name: string;
  description: string;
  imageUrl: string;
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

export default function NFTCard({
  objectId,
  tokenId,
  name,
  description,
  imageUrl,
  mediaType,
  watchPrice,
  creator,
  totalDonated,
}: NFTCardProps) {
  const account = useCurrentAccount();
  const { toast } = useToast();

  const [donateAmount, setDonateAmount] = useState("");
  const [donating, setDonating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [imgSrc, setImgSrc] = useState(imageUrl);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const handleImageError = () => {
    const nextIdx = gatewayIndex + 1;
    if (nextIdx < IPFS_GATEWAYS.length) {
      const cid = imageUrl.split("/ipfs/").pop() || imageUrl;
      setImgSrc(`${IPFS_GATEWAYS[nextIdx]}${cid}`);
      setGatewayIndex(nextIdx);
    }
  };

  async function handleDonate() {
    if (!account) {
      toast({ title: "Connect your wallet first", variant: "destructive" });
      return;
    }
    const amountOCT = parseFloat(donateAmount);
    if (!amountOCT || amountOCT <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    try {
      setDonating(true);
      const amountMist = Math.floor(amountOCT * 1e9);

      const res = await fetch("/api/tx/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nftObjectId: objectId,
          amountMist,
          senderAddress: account.address,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Donate failed" }));
        throw new Error(errData.error || `Donate failed (${res.status})`);
      }

      const result = await res.json();

      toast({
        title: "🎉 Donation successful!",
        description: `Donated ${amountOCT} OCT. Tx: ${result.digest.slice(0, 16)}...`,
      });

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      setDonateAmount("");
      setDialogOpen(false);
    } catch (err: any) {
      console.error("Donate failed:", err);
      const msg = err?.message || String(err) || "Something went wrong";
      let userMsg = msg;
      if (msg.includes("Rejected") || msg.includes("rejected")) {
        userMsg = "Transaction was rejected in your wallet.";
      } else if (msg.includes("insufficient") || msg.includes("InsufficientGas") || msg.includes("No valid gas")) {
        userMsg = "Not enough OCT. Get testnet tokens from the faucet.";
      }
      toast({
        title: "Donation failed",
        description: userMsg,
        variant: "destructive",
      });
    } finally {
      setDonating(false);
    }
  }

  async function handlePayToWatch() {
    if (!account) {
      toast({ title: "Connect your wallet first", variant: "destructive" });
      return;
    }

    try {
      setPaying(true);

      const res = await fetch("/api/tx/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nftObjectId: objectId,
          watchPrice,
          senderAddress: account.address,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Payment failed" }));
        throw new Error(errData.error || `Payment failed (${res.status})`);
      }

      const result = await res.json();

      toast({
        title: "🎬 Access granted!",
        description: `You can now watch this video. Tx: ${result.digest.slice(0, 16)}...`,
      });
    } catch (err: any) {
      console.error("Pay to watch failed:", err);
      const msg = err?.message || String(err) || "Something went wrong";
      let userMsg = msg;
      if (msg.includes("Rejected") || msg.includes("rejected")) {
        userMsg = "Transaction was rejected in your wallet.";
      } else if (msg.includes("insufficient") || msg.includes("InsufficientGas") || msg.includes("No valid gas")) {
        userMsg = "Not enough OCT. Get testnet tokens from the faucet.";
      }
      toast({
        title: "Payment failed",
        description: userMsg,
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
        />
      )}
      <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
        <CardHeader className="p-0 relative">
          {mediaType === "video" ? (
            <div className="relative w-full h-64 bg-secondary flex items-center justify-center">
              <Video className="h-16 w-16 text-muted-foreground" />
              <span className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                Video
              </span>
              {watchPrice > 0 && (
                <span className="absolute bottom-2 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-medium">
                  {(watchPrice / 1e9).toFixed(4)} OCT
                </span>
              )}
            </div>
          ) : (
            <div className="relative w-full h-64">
              <Image
                src={imgSrc}
                alt={name}
                fill
                className="object-cover"
                onError={handleImageError}
                unoptimized
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-lg truncate">{name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>By: {creator.slice(0, 6)}...{creator.slice(-4)}</span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-red-500" />
              {(totalDonated / 1e9).toFixed(4)} OCT
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 gap-2">
          {/* Donate Button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="flex-1">
                <Heart className="mr-1 h-4 w-4" />
                Donate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Donate to "{name}"</DialogTitle>
                <DialogDescription>
                  Support this creator by sending OCT to their NFT.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Amount in OCT"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleDonate} disabled={donating}>
                  {donating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Donating...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-4 w-4" />
                      Send Donation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Pay to Watch (video only) */}
          {mediaType === "video" && watchPrice > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={handlePayToWatch}
              disabled={paying}
            >
              {paying ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-1 h-4 w-4" />
              )}
              Watch
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
}
