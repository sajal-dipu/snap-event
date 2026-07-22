import { NextResponse } from "next/server";
import { aiFaceRecognitionService } from "@/services/AiFaceRecognitionService";
import { logger } from "@/utils/logger";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const roomId = formData.get("roomId") as string;

    const files: File[] = [];
    const rawFiles = formData.getAll("files");
    if (rawFiles.length > 0) {
      rawFiles.forEach((f) => {
        if (f instanceof File) files.push(f);
      });
    }
    const singleFile = formData.get("file");
    if (singleFile && singleFile instanceof File) {
      files.push(singleFile);
    }

    if (files.length === 0 || !roomId) {
      return NextResponse.json(
        { error: "Missing selfie file(s) or roomId in multipart request" },
        { status: 400 }
      );
    }

    const thresholdRaw = formData.get("threshold") as string | null;
    const threshold = thresholdRaw ? parseFloat(thresholdRaw) : 0.92;

    logger.info(`Selfie matching request received for room ${roomId}, selfie count: ${files.length}, threshold: ${threshold}`);
    
    const { matchedPhotos, confidences, faceConfidences, thresholdUsed } = await aiFaceRecognitionService.matchGuestSelfie(roomId, files, threshold);

    // Map photo details securely: limit to top 20 matches max
    const safePhotos = matchedPhotos.slice(0, 20).map((p: any) => {
      const rawConf = confidences[p.id] || 0.0;
      const faceConf = faceConfidences[p.id] || 0.95;
      return {
        id: p.id,
        fileName: p.originalFilename || p.asset?.publicId || "photo.jpg",
        secureUrl: p.secureUrl || p.asset?.secureUrl || p.asset?.url,
        thumbnailUrl: p.thumbnailUrl || p.secureUrl,
        mediumUrl: p.secureUrl,
        width: p.asset?.width || 1200,
        height: p.asset?.height || 800,
        confidence: rawConf,
        faceConfidence: faceConf,
        confidencePercent: `${Math.round(rawConf * 100)}% MATCH`,
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      roomId,
      thresholdUsed,
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
