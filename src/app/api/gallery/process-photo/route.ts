import { NextResponse } from "next/server";
import { aiFaceRecognitionService } from "@/services/AiFaceRecognitionService";
import { logger } from "@/utils/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { photoId, roomId } = body;

    if (!photoId || !roomId) {
      return NextResponse.json(
        { error: "Missing photoId or roomId in request body" },
        { status: 400 }
      );
    }

    logger.info(`Triggering background face analysis for photo ${photoId}`);
    
    // Execute processing (it automatically fetches document, updates Firestore state)
    const result = await aiFaceRecognitionService.processPhoto(photoId, roomId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "AI analysis failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      faceCount: result.faceCount,
      message: "Photo face metadata processed successfully"
    });
  } catch (error: any) {
    logger.error("Error in process-photo API route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
