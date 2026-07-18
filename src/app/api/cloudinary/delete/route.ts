import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary/cloudinary";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicId } = body;

    if (!publicId) {
      return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
    }

    let cleanPublicId = publicId;
    const dotIndex = cleanPublicId.lastIndexOf(".");
    if (dotIndex !== -1) {
      cleanPublicId = cleanPublicId.substring(0, dotIndex);
    }

    console.log("Deleting publicId:", cleanPublicId);

    const result = await cloudinary.uploader.destroy(cleanPublicId, {
      resource_type: "image",
      invalidate: true
    });

    console.log("Cloudinary destroy result:", result);

    if (result.result !== "ok" && result.result !== "not found") {
      return NextResponse.json({ error: `Cloudinary destroy returned result: ${result.result}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: result.result });
  } catch (error: any) {
    console.error("Failed to delete Cloudinary asset:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete Cloudinary asset" },
      { status: 500 }
    );
  }
}
