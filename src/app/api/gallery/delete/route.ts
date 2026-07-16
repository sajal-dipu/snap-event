import { NextRequest, NextResponse } from "next/server";
import { cloudinaryService } from "@/services/CloudinaryService";
import { logger } from "@/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const roleCookie = request.cookies.get("snapEvent-role")?.value;
    if (!roleCookie || roleCookie !== "photographer") {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { publicIds } = body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return NextResponse.json({ error: "Missing publicIds array" }, { status: 400 });
    }

    logger.info(`Server-side deleting ${publicIds.length} Cloudinary assets`);
    await cloudinaryService.deleteMultiple(publicIds);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Failed to delete Cloudinary assets:", error);
    return NextResponse.json(
      { error: "Failed to delete Cloudinary assets" },
      { status: 500 }
    );
  }
}
