import { NextRequest, NextResponse } from "next/server";
import { getSessionRefreshToken } from "../../../lib/google-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { connected: Boolean(getSessionRefreshToken(request)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}