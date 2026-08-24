const AUTH = "https://webflow.com/oauth/authorize";
const TOKEN = "https://api.webflow.com/oauth/access_token";

export const WEBFLOW_SCOPES = ["sites:read", "cms:read"].join(" ");

export function oauthAuthorizeUrl(state: string): string {
  const clientId = process.env.WEBFLOW_CLIENT_ID;
  const redirect = process.env.WEBFLOW_REDIRECT_URI;
  if (!clientId || !redirect) {
    throw new Error("WEBFLOW_CLIENT_ID and WEBFLOW_REDIRECT_URI must be set");
  }
  const url = new URL(AUTH);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("scope", WEBFLOW_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(code: string): Promise<string> {
  const clientId = process.env.WEBFLOW_CLIENT_ID;
  const clientSecret = process.env.WEBFLOW_CLIENT_SECRET;
  const redirect = process.env.WEBFLOW_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirect) {
    throw new Error("Webflow OAuth env vars are not set");
  }

  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirect,
    }),
  });
  if (!res.ok) {
    throw new Error(`Webflow token exchange ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Webflow OAuth response missing access_token");
  }
  return data.access_token;
}
