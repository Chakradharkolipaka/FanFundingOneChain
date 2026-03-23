"use client";

import { useState, useRef, useCallback } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Upload, ImagePlus, Video, Loader2 } from "lucide-react";
import { PACKAGE_ID, REGISTRY_ID } from "@/constants";

export default function MintPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [watchPrice, setWatchPrice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [minting, setMinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    // Detect media type from file
    if (selected.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      setMediaType("image");
    }

    // Create preview
    const url = URL.createObjectURL(selected);
    setPreview(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    setFile(dropped);

    if (dropped.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      setMediaType("image");
    }

    const url = URL.createObjectURL(dropped);
    setPreview(url);
  }, []);

  async function handleMint() {
    if (!account) {
      toast({ title: "Connect your wallet first", variant: "destructive" });
      return;
    }
    if (!file || !name || !description) {
      toast({ title: "Please fill all fields and select a file", variant: "destructive" });
      return;
    }

    try {
      // Step 1: Upload to Pinata via API route
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("description", description);

      const uploadRes = await fetch("/api/pinata/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { metadataUrl } = await uploadRes.json();
      setUploading(false);

      // Step 2: Mint on-chain
      setMinting(true);
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

      const result = await signAndExecute({
        transaction: tx,
      });

      toast({
        title: "🎉 NFT Minted!",
        description: `Transaction: ${result.digest.slice(0, 16)}...`,
      });

      // Reset form
      setName("");
      setDescription("");
      setFile(null);
      setPreview(null);
      setWatchPrice("");
      setMediaType("image");
    } catch (err: any) {
      console.error("Mint failed:", err);
      toast({
        title: "Mint failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setMinting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-6 w-6" />
            Mint New NFT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            {preview ? (
              <div className="space-y-2">
                {mediaType === "video" ? (
                  <video
                    src={preview}
                    className="max-h-64 mx-auto rounded-lg"
                    controls
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg object-contain"
                  />
                )}
                <p className="text-sm text-muted-foreground">{file?.name}</p>
              </div>
            ) : (
              <div className="space-y-2 text-muted-foreground">
                <Upload className="h-10 w-10 mx-auto" />
                <p>Drag & drop an image or video, or click to browse</p>
                <p className="text-xs">Supports JPG, PNG, GIF, MP4, WebM</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Media Type Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Type:</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              mediaType === "video"
                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            }`}>
              {mediaType === "video" ? <Video className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}
              {mediaType === "video" ? "Video NFT" : "Image NFT"}
            </span>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              placeholder="My Awesome NFT"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe your creation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Watch Price (video only) */}
          {mediaType === "video" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Watch Price (OCT)</label>
              <Input
                type="number"
                step="0.001"
                min="0"
                placeholder="0.01"
                value={watchPrice}
                onChange={(e) => setWatchPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Set a price for pay-per-view. Leave 0 for free viewing.
              </p>
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleMint}
            disabled={!account || uploading || minting || !file || !name || !description}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading to IPFS...
              </>
            ) : minting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting on OneChain...
              </>
            ) : !account ? (
              "Connect Wallet to Mint"
            ) : (
              "🚀 Mint NFT"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
