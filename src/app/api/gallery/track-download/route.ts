import { NextRequest, NextResponse } from "next/server";
import { downloadRequestService } from "@/services/DownloadRequestService";
import { logger } from "@/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const device = request.headers.get("user-agent") || "Unknown Device";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "127.0.0.1";

    logger.info(`Tracking download request analytics for ID: ${requestId}`);
    await downloadRequestService.trackDownload(requestId, device, ip);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error tracking download request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record download analytics" },
      { status: 500 }
    );
  }
}
