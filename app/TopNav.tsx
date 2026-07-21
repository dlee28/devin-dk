import Link from "next/link";
import { Home } from "lucide-react";
import { getCurrentUser, listUsers } from "@/platform/currentUser";
import { UserSwitcher } from "./UserSwitcher";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  reviewer: "bg-blue-100 text-blue-800",
};

// Top navigation: links back to the launcher from every app and hosts the
// "Viewing as:" identity-stub switcher (see platform/currentUser.ts).
export function TopNav() {
  const users = listUsers();
  const current = getCurrentUser();
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:text-blue-700">
          <Home className="h-4 w-4" aria-hidden="true" /> Internal Tools
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Viewing as:</span>
          <UserSwitcher users={users} currentId={current.id} />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[current.role]}`}
          >
            {current.role}
          </span>
        </div>
      </div>
    </header>
  );
}
