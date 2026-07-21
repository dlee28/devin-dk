import Link from "next/link";
import { ScrollText, Settings } from "lucide-react";
import { appsVisibleTo } from "@/platform/appRegistry";
import { AppIcon } from "@/platform/appIcons";
import { governPageView } from "@/platform/withGovernance";
import { hasPermission } from "@/platform/roles";

// App launcher: renders whatever the platform registry says is installed,
// filtered server-side by the current user's role. No app names are
// hardcoded here - adding an app means adding a registry entry only.
export default function LauncherPage() {
  const user = governPageView("/", "launcher");
  const apps = appsVisibleTo(user.role);
  const canViewLogs = hasPermission(user.role, "view_logs");

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Internal Tools</h1>
      <p className="mb-6 text-sm text-gray-500">
        Apps available to <span className="font-medium">{user.name}</span> ({user.role})
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <div
            key={app.key}
            className="relative rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow"
          >
            <div className="absolute right-3 top-3 z-10 flex gap-1">
              {canViewLogs && (
                <Link
                  href={`/logs/${app.key}`}
                  aria-label={`${app.name} logs`}
                  title={`${app.name} logs`}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <ScrollText className="h-5 w-5" aria-hidden="true" />
                </Link>
              )}
              <Link
                href={`/settings/${app.key}`}
                aria-label={`${app.name} settings`}
                title={`${app.name} settings`}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <Link href={app.path} className="block">
              <div className="mb-2 text-blue-600">
                <AppIcon icon={app.icon} className="h-8 w-8" />
              </div>
              <div className="font-semibold">{app.name}</div>
              <div className="mt-1 text-sm text-gray-500">{app.description}</div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
