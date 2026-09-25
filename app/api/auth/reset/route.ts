import { NextRequest, NextResponse } from "next/server";
import { AuthUserError, updatePasswordWithRecoveryToken } from "@/src/app/goauth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function POST(request: NextRequest) {
  let body: { accessToken?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const accessToken = String(body.accessToken ?? "");
  const password = String(body.password ?? "");
  if (!accessToken) {
    return NextResponse.json(
      { error: "This reset link is incomplete. Request a new one from the sign-in page." },
      { status: 400 }
    );
  }

  try {
    await updatePasswordWithRecoveryToken(accessToken, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Password update failed";
    const status = err instanceof AuthUserError ? 400 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
}
