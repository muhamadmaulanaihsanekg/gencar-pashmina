
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  return NextResponse.redirect(new URL(`/uploads/${filename}`, request.url));
}
