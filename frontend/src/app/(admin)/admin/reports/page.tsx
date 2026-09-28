import { AppRoute } from "@/components/layout/AppRoute";

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const { view } = await searchParams;
  return <AppRoute page="admin-reports" reportView={view === "participants" ? "participants" : "overview"} />;
}
