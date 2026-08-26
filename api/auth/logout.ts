import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearAuthCookies } from "../../src/app/auth.js";
import { clearCookie, SESSION_COOKIE } from "../../src/app/session.js";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  clearAuthCookies(res);
  clearCookie(res, SESSION_COOKIE);
  res.status(200).json({ ok: true });
}
