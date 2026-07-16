import { NextResponse } from "next/server";
import { aiFaceRecognitionService } from "@/services/AiFaceRecognitionService";
import { logger } from "@/utils/logger";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const roomId = formData.get("roomId") as string;

    if (!file || !roomId) {
      return NextResponse.json(
        { error: "Missing file or roomId in multipart request" },
        { status: 400 }
      );
    }

    logger.info(`Selfie matching request received for room ${roomId}, file name: ${file.name}`);
    
    const { matchedPhotos, confidences } = await aiFaceRecognitionService.matchGuestSelfie(roomId, file);

    // Map photo details securely: omit raw Cloudinary public IDs, expose safe delivery URLs
    const safePhotos = matchedPhotos.map((p: any) => ({
      id: p.id,
      fileName: p.originalFilename || p.asset?.publicId || "photo.jpg",
      secureUrl: p.secureUrl || p.asset?.secureUrl || p.asset?.url,
      thumbnailUrl: p.thumbnailUrl || p.secureUrl,
      mediumUrl: p.secureUrl, // use standard URLs
      width: p.asset?.width || 1200,
      height: p.asset?.height || 800,
      confidence: confidences[p.id] || 0.0,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      success: true,
      roomId,
      photoCount: safePhotos.length,
      photos: safePhotos,
    });
  } catch (error: any) {
    logger.error("Error in match-faces API route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
export const maxDuration = 60; // 60s timeout for deep learning inference
