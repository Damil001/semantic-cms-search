import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Keep OAuth + cookies on www — apex breaks Webflow redirect URI matching. */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (host === "talaash.org") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "www.talaash.org";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|map)$).*)"],
};
