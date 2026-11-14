import { NextRequest, NextResponse } from "next/server";
import { classifyWasteImage } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, mimeType } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Image data (base64 string) is required." },
        { status: 400 }
      );
    }

    // Restrict payload size (approx 10MB base64)
    if (image.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image file exceeds maximum allowable size (10MB)." },
        { status: 413 }
      );
    }

    const result = await classifyWasteImage(image, mimeType || "image/jpeg");

    return NextResponse.json({
      ...result,
      warning:
        "AI vision classifications are predictive recommendations and must be verified by facility personnel prior to logging.",
    });
  } catch (error) {
    console.error("Waste classification error:", error);
    return NextResponse.json(
      { error: "Failed to process waste classification image." },
      { status: 500 }
    );
  }
}
