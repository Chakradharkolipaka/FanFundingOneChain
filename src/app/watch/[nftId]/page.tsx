"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const nftId = params.nftId as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [nftName, setNftName] = useState<string>("");
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check sessionStorage for access token (cleared when tab closes)
    const accessKey = `watch_access_${nftId}`;
    const storedData = sessionStorage.getItem(accessKey);

    if (!storedData) {
      setDenied(true);
      setLoading(false);
      return;
    }

    try {
      const { videoUrl: url, name, expiresAt } = JSON.parse(storedData);

      // Token expires after 2 hours of inactivity
      if (Date.now() > expiresAt) {
        sessionStorage.removeItem(accessKey);
        setDenied(true);
        setLoading(false);
        return;
      }

      setVideoUrl(url);
      setNftName(name);
      setLoading(false);
    } catch {
      sessionStorage.removeItem(accessKey);
      setDenied(true);
      setLoading(false);
    }

    // Clear access when page unloads (back button, tab close, navigate away)
    const clearOnExit = () => sessionStorage.removeItem(accessKey);
    window.addEventListener("beforeunload", clearOnExit);
    window.addEventListener("pagehide", clearOnExit);

    return () => {
      window.removeEventListener("beforeunload", clearOnExit);
      window.removeEventListener("pagehide", clearOnExit);
      // Also clear when React unmounts (navigation within app)
      sessionStorage.removeItem(accessKey);
    };
  }, [nftId]);

  // Block right-click on the video
  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  // Block keyboard shortcuts for saving (Ctrl+S, Ctrl+U, F12)
  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === "s" || e.key === "u" || e.key === "S" || e.key === "U")) ||
        e.key === "F12"
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", blockKeys);
    return () => document.removeEventListener("keydown", blockKeys);
  }, []);

  const handleExit = () => {
    // Explicitly clear access on manual exit too
    sessionStorage.removeItem(`watch_access_${nftId}`);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-white animate-spin" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 text-white">
        <Lock className="h-16 w-16 text-yellow-400" />
        <h1 className="text-2xl font-bold">Access Required</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          This content requires payment. Return to the home page and pay to watch.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col"
      onContextMenu={handleContextMenu}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white font-medium text-sm">{nftName}</span>
          <span className="text-xs text-yellow-400 border border-yellow-400/50 rounded px-1.5 py-0.5">
            PAID ACCESS
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:text-red-400 hover:bg-white/10"
          onClick={handleExit}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Exit
        </Button>
      </div>

      {/* Video player — fullscreen, no download */}
      <div className="flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoUrl!}
          className="max-w-full max-h-full w-full h-full object-contain"
          controls
          autoPlay
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          onContextMenu={handleContextMenu}
        />
      </div>
    </div>
  );
}
