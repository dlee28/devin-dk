import Link from "next/link";
import { appsVisibleTo } from "@/platform/appRegistry";
import { governPageView } from "@/platform/withGovernance";

// App launcher: renders whatever the platform registry says is installed,
// filtered server-side by the current user's role. No app names are
// hardcoded here - adding an app means adding a registry entry only.
export default function LauncherPage() {
  const user = governPageView("/", "launcher");
  const apps = appsVisibleTo(user.role);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Internal Tools</h1>
      <p className="mb-6 text-sm text-gray-500">
        Apps available to <span className="font-medium">{user.name}</span> ({user.role})
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <Link
            key={app.key}
            href={app.path}
            className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow"
          >
            <div className="mb-2 text-3xl">{app.icon}</div>
            <div className="font-semibold">{app.name}</div>
            <div className="mt-1 text-sm text-gray-500">{app.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
