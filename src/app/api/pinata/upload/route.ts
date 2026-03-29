import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Vercel serverless limit is 4.5 MB — validate before Pinata upload
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

export async function POST(req: Request) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      console.error("PINATA_JWT not set in environment");
      return NextResponse.json(
        { error: "Server misconfigured — missing PINATA_JWT. Set it in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch (e: any) {
      return NextResponse.json(
        { error: "Failed to parse form data. File may be too large (max 4 MB)." },
        { status: 400 }
      );
    }

    const file = form.get("file") as File | null;
    const name = (form.get("name") as string | null) ?? "";
    const description = (form.get("description") as string | null) ?? "";

    if (!file || !name || !description) {
      return NextResponse.json(
        { error: "Missing file, name, or description" },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 4 MB on Vercel.` },
        { status: 413 }
      );
    }

    // Upload file to Pinata
    const fileForm = new FormData();
    fileForm.append("file", file);
    fileForm.append("pinataMetadata", JSON.stringify({ name: file.name }));
    fileForm.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const fileRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: fileForm,
    });

    if (!fileRes.ok) {
      const txt = await fileRes.text();
      console.error("Pinata file upload failed:", fileRes.status, txt);
      return NextResponse.json(
        { error: `File upload to IPFS failed: ${fileRes.status}` },
        { status: 502 }
      );
    }

    const fileJson = await fileRes.json();
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${fileJson.IpfsHash}`;

    // Detect media type from file mime type
    const isVideo = file.type.startsWith("video/");

    // Upload metadata to Pinata
    // For videos: include animation_url so the pay route can extract the real video URL
    // For images: include image field only
    const pinataContent: Record<string, string> = {
      name,
      description,
      image: isVideo ? "" : imageUrl,       // thumbnail or empty for video
      ...(isVideo ? { animation_url: imageUrl } : {}),
    };

    const metaRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataContent,
        pinataMetadata: { name: `${name}-metadata` },
      }),
    });

    if (!metaRes.ok) {
      const txt = await metaRes.text();
      console.error("Pinata metadata upload failed:", metaRes.status, txt);
      return NextResponse.json(
        { error: `Metadata upload to IPFS failed: ${metaRes.status}` },
        { status: 502 }
      );
    }

    const metaJson = await metaRes.json();
    const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metaJson.IpfsHash}`;

    return NextResponse.json({ imageUrl, metadataUrl });
  } catch (err: any) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
