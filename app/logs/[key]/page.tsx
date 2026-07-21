// Routing shell: per-application log viewer.
import { notFound } from "next/navigation";
import LogsPage from "@/apps/admin/LogsPage";
import { getApp } from "@/platform/appRegistry";

export default function AppLogsRoute({ params }: { params: { key: string } }) {
  const app = getApp(params.key);
  if (!app) notFound();
  return <LogsPage appKey={app.key} appName={app.name} />;
}
