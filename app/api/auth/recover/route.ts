import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/src/app/goauth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const RESET_REDIRECT = "https://www.talaash.org/reset-password";

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter the email you signed up with." }, { status: 400 });
  }

  try {
    await requestPasswordReset(email, RESET_REDIRECT);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send reset email";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, we’ve sent a password reset link. Check your inbox and spam folder.",
  });
}
