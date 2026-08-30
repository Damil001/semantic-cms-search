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
            <Link href="/pricing">Pricing</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
