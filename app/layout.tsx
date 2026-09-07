import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Search Intelligence",
  description: "Semantic search and analytics for Webflow CMS",
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
            <span>Search Intelligence</span>
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
