import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "@/utils/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { photoId, roomId, feedback, confidenceScore, guestUid } = body;

    if (!photoId || !roomId || !feedback) {
      return NextResponse.json(
        { error: "Missing required fields: photoId, roomId, feedback" },
        { status: 400 }
      );
    }

    if (feedback !== "this_is_me" && feedback !== "not_my_photo") {
      return NextResponse.json(
        { error: "Invalid feedback value. Expected 'this_is_me' or 'not_my_photo'" },
        { status: 400 }
      );
    }

    logger.info(`[LOG] User Feedback Received: Photo=${photoId}, Room=${roomId}, Feedback=${feedback}, Confidence=${confidenceScore}`);

    // Store feedback entry in Firestore 'matchFeedback' collection
    const feedbackRef = adminDb.collection("matchFeedback").doc();
    await feedbackRef.set({
      photoId,
      roomId,
      guestUid: guestUid || "anonymous",
      feedback,
      confidenceScore: confidenceScore || 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: feedback === "this_is_me" ? "Match confirmed as correct" : "Photo marked as not matching",
      feedbackId: feedbackRef.id,
    });
  } catch (error: any) {
    logger.error("Error in match-feedback API route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
