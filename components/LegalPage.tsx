import type { ReactNode } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <TopNav showAuth={false} />
      <main className="container section--tight" style={{ maxWidth: 720, paddingBottom: 96 }}>
        <p className="caption text-muted" style={{ marginBottom: 8 }}>
          <Link href="/app">Search Intelligence</Link>
        </p>
        <h1 className="title-lg" style={{ marginBottom: 8 }}>
          {title}
        </h1>
        <p className="caption text-muted" style={{ marginBottom: 32 }}>
          Last updated: September 7, 2026
        </p>
        <div className="legal-prose body-md">{children}</div>
      </main>
    </>
  );
}
