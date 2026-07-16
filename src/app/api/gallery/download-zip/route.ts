import { NextRequest, NextResponse } from "next/server";
import { downloadRequestService } from "@/services/DownloadRequestService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { cloudinary } from "@/lib/cloudinary/cloudinary";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token parameter" }, { status: 400 });
    }

    // 1. Resolve download request
    const req = await downloadRequestService.getByToken(token);
    if (!req) {
      return NextResponse.json({ error: "Invalid download link" }, { status: 404 });
    }

    // 2. Validate request status
    if (req.status !== "approved") {
      return NextResponse.json({ error: "Link is not approved" }, { status: 403 });
    }

    // 3. Check expiry
    const expiry = req.downloadExpiresAt?.toDate();
    if (expiry && expiry < new Date()) {
      // Mark as expired in db if not already updated
      await downloadRequestService.expire(req.id);
      return NextResponse.json({ error: "Link has expired" }, { status: 410 });
    }

    if (req.approvedPhotoIds.length === 0) {
      return NextResponse.json({ error: "No photos are approved for this request" }, { status: 400 });
    }

    // 4. Resolve public IDs of approved photos from Firestore
    const snaps = await Promise.all(
      req.approvedPhotoIds.map((id) => getDoc(doc(db, "photos", id)))
    );
    
    const publicIds = snaps
      .filter((s) => s.exists())
      .map((s) => {
        const data = s.data() as any;
        return data.asset?.publicId || data.cloudinaryPublicId;
      })
      .filter(Boolean);

    if (publicIds.length === 0) {
      return NextResponse.json({ error: "No photo assets found on storage" }, { status: 404 });
    }

    // 5. Generate secure zip url via Cloudinary Node SDK helper
    const zipUrl = cloudinary.utils.download_zip_url({
      public_ids: publicIds,
      resource_type: "image",
    });

    // 6. Record download history analytics
    const device = request.headers.get("user-agent") || "Unknown Device";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "127.0.0.1";
    await downloadRequestService.trackDownload(req.id, device, ip);

    // 7. Redirect to Cloudinary signed ZIP file
    return NextResponse.redirect(zipUrl);
  } catch (error: any) {
    logger.error("Error generating zip URL:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
export const maxDuration = 60; // 60s timeout for Cloudinary zip generation
