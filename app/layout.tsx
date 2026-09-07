import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Talaash",
    template: "%s · Talaash",
  },
  description: "Semantic search and analytics for Webflow CMS",
  metadataBase: new URL("https://www.talaash.org"),
  applicationName: "Talaash",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.png"],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Talaash",
    description: "Semantic search and analytics for Webflow CMS",
    url: "https://www.talaash.org",
    siteName: "Talaash",
    images: [
      {
        url: "/brand/talaash-logo.png",
        width: 512,
        height: 512,
        alt: "Talaash",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Talaash",
    description: "Semantic search and analytics for Webflow CMS",
    images: ["/brand/talaash-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#181d26",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="footer">
          <div
            className="container"
            style={{
              padding: 0,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <span>Talaash</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <Link href="/install">Install</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/support">Support</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
