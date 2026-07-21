"use client";

// SECOND THIN APP (stretch goal): feature-flag panel on the same platform
// layer. No platform changes were needed beyond a registry entry and the two
// flag permissions in roles.ts (noted in PROTOTYPE-GAPS.md). Governance is
// inherited via the /api/flags routes.

import { useCallback, useEffect, useState } from "react";

interface Flag {
  id: string;
  key: string;
  description: string;
  enabled: number;
  environment: "staging" | "production";
  updated_at: string;
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/flags");
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to load flags");
      return;
    }
    setFlags((await res.json()).flags);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/flags/${id}/toggle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!res.ok) setError((await res.json()).error ?? `Request failed (${res.status})`);
    await load();
  };

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Feature Flags</h1>
      <p className="mb-4 text-sm text-gray-500">
        Staging flags: both roles. Production flags: admin only (enforced by the platform layer).
      </p>
      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Environment</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{f.key}</td>
                <td className="px-4 py-3">{f.description}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      f.environment === "production" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {f.environment}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggle(f.id)}
                    className={`relative h-6 w-11 rounded-full transition ${f.enabled ? "bg-green-500" : "bg-gray-300"}`}
                    aria-label={`Toggle ${f.key}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${f.enabled ? "left-[22px]" : "left-0.5"}`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(f.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
