const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://nftstorage.link/ipfs/",
];

/**
 * Upload a file to Pinata IPFS via our API route.
 * Returns { imageUrl, metadataUrl } on success.
 */
export async function uploadToPinata(
  file: File,
  name: string,
  description: string
): Promise<{ imageUrl: string; metadataUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  formData.append("description", description);

  const res = await fetch("/api/pinata/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }

  return res.json();
}

/**
 * Resolve an IPFS URI to an HTTP gateway URL.
 */
export function resolveIpfsUrl(uri: string): string {
  if (!uri) return "/placeholder.png";
  if (uri.startsWith("http")) return uri;
  const cid = uri.replace("ipfs://", "");
  return `${PINATA_GATEWAY}${cid}`;
}

/**
 * Try multiple IPFS gateways to find a working image URL.
 */
export async function findWorkingGateway(cid: string): Promise<string> {
  for (const gw of IPFS_GATEWAYS) {
    try {
      const res = await fetch(`${gw}${cid}`, { method: "HEAD" });
      if (res.ok) return `${gw}${cid}`;
    } catch {
      continue;
    }
  }
  return `${PINATA_GATEWAY}${cid}`;
}
