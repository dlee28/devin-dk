import AppSettingsPage from "@/apps/settings/AppSettingsPage";

export default function SettingsRoute({ params }: { params: { key: string } }) {
  return <AppSettingsPage appKey={params.key} />;
}
