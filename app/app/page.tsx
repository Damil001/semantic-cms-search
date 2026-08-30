"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { DashboardApp } from "@/components/dashboard/DashboardApp";

export default function AppPage() {
  const [email, setEmail] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setEmail(d.email))
      .catch(() => setEmail(undefined));
  }, []);

  return (
    <>
      <TopNav email={email} />
      <DashboardApp />
    </>
  );
}
