"use client";

import { useRouter } from "next/navigation";
import type { User } from "@/platform/roles";

export function UserSwitcher({ users, currentId }: { users: User[]; currentId: string }) {
  const router = useRouter();
  return (
    <select
      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
      value={currentId}
      onChange={async (e) => {
        await fetch("/api/viewing-as", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: e.target.value }),
        });
        router.refresh();
      }}
    >
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name} ({u.role})
        </option>
      ))}
    </select>
  );
}
