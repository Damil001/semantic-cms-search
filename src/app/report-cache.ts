import { getServiceClient } from "../lib/supabase.js";

export async function saveInstallReport(
  installId: string,
  kind: "content_insights" | "aeo",
  report: unknown
): Promise<void> {
  const supabase = getServiceClient();
  const now = new Date().toISOString();
  const patch =
    kind === "content_insights"
      ? { content_insights_report: report, content_insights_at: now, updated_at: now }
      : { aeo_report: report, aeo_report_at: now, updated_at: now };

  const { error } = await supabase
    .from("webflow_installs")
    .update(patch)
    .eq("id", installId);

  if (error) {
    // Column may be missing until migration runs — don't fail the analysis response.
    console.error(`save ${kind} report failed`, error.message);
  }
}

export async function loadInstallReport<T>(
  installId: string,
  kind: "content_insights" | "aeo"
): Promise<{ report: T; savedAt: string } | null> {
  const supabase = getServiceClient();
  const select =
    kind === "content_insights"
      ? "content_insights_report, content_insights_at"
      : "aeo_report, aeo_report_at";

  const { data, error } = await supabase
    .from("webflow_installs")
    .select(select)
    .eq("id", installId)
    .maybeSingle();

  if (error) {
    console.error(`load ${kind} report failed`, error.message);
    return null;
  }
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const report =
    kind === "content_insights"
      ? row.content_insights_report
      : row.aeo_report;
  const savedAt =
    kind === "content_insights"
      ? row.content_insights_at
      : row.aeo_report_at;

  if (!report || typeof report !== "object") return null;
  return {
    report: report as T,
    savedAt: typeof savedAt === "string" ? savedAt : new Date().toISOString(),
  };
}
