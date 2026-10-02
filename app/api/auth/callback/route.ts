import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleOAuthClient,
  encryptRefreshToken,
  getGoogleRedirectUri,
  SESSION_COOKIE,
  sessionCookieOptions,
  STATE_COOKIE,
  stateCookieOptions,
} from "../../../lib/google-auth";

export const runtime = "nodejs";

function redirectWithStatus(request: NextRequest, status: "connected" | "error") {
  const response = NextResponse.redirect(new URL(`/?drive=${status}`, request.url));
  response.cookies.set(STATE_COOKIE, "", { ...stateCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;
  const code = request.nextUrl.searchParams.get("code");

  if (!state || !savedState || state !== savedState || !code || request.nextUrl.searchParams.has("error")) {
    return redirectWithStatus(request, "error");
  }

  try {
    const { tokens } = await createGoogleOAuthClient(getGoogleRedirectUri(request)).getToken(code);
    if (!tokens.refresh_token) return redirectWithStatus(request, "error");

    const response = redirectWithStatus(request, "connected");
    response.cookies.set(SESSION_COOKIE, encryptRefreshToken(tokens.refresh_token), sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return redirectWithStatus(request, "error");
  }
}