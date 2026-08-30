import { NextResponse } from "next/server";
import cloudinary from "@/utlis/cloudinary";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const fileUri = `data:${file.type};base64,${base64Data}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileUri, {
      folder: "fajra_academy_avatars",
    });

    return NextResponse.json({
      success: true,
      secure_url: result.secure_url,
    }, { status: 200 });
  } catch (error) {
    console.error("Cloudinary upload API error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
