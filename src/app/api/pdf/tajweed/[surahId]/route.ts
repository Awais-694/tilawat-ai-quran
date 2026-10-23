import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSurahMeta } from "@/lib/quran/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surahId: string }> }
) {
  try {
    const { surahId } = await params;
    const sNum = parseInt(surahId, 10);

    if (isNaN(sNum) || sNum < 1 || sNum > 114) {
      return new NextResponse("Invalid Surah Number", { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "tajweed", "surahs", `${sNum}.pdf`);

    if (!fs.existsSync(filePath)) {
      return new NextResponse(`Tajweed PDF for Surah ${sNum} not found`, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const meta = getSurahMeta(sNum);
    const fileName = `Surah_${sNum}_${meta?.name || "Mushaf"}_Tajweed.pdf`;

    const isDownload = request.nextUrl.searchParams.get("download") === "1";
    const disposition = isDownload
      ? `attachment; filename="${fileName}"`
      : `inline; filename="${fileName}"`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length": fileBuffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (error) {
    console.error("Error serving Tajweed Surah PDF:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
