import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  clearAuthCookies,
  getAuthUser,
  setAuthCookies,
  signIn,
  signUp,
} from "../../src/app/auth.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method === "GET") {
    const user = await getAuthUser(req);
    if (!user) {
      res.status(200).json({ authenticated: false });
      return;
    }
    res.status(200).json({
      authenticated: true,
      email: user.email,
      userId: user.id,
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const action = String(req.body?.action ?? "login");
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  try {
    const result =
      action === "signup" ? await signUp(email, password) : await signIn(email, password);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({
      ok: true,
      email: result.user.email,
      userId: result.user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth failed";
    res.status(400).json({ error: message });
  }
}
