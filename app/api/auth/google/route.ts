import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createGoogleOAuthClient, getGoogleRedirectUri, STATE_COOKIE, stateCookieOptions } from "../../../lib/google-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const state = randomBytes(32).toString("hex");
    const authUrl = createGoogleOAuthClient(getGoogleRedirectUri(request)).generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive"],
      state,
    });
    const response = NextResponse.redirect(authUrl);
    response.cookies.set(STATE_COOKIE, state, stateCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Google sign-in is not configured on the server." }, { status: 500 });
  }
}