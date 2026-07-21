"use client";

// Admin-only log viewer. The page itself does not check roles - the governed
// /api/logs endpoint returns 403 for non-admins (and logs the denial).

import { useCallback, useEffect, useState } from "react";

interface LogRow {
  id: number;
  [key: string]: unknown;
}

const AUDIT_COLS = ["timestamp", "actor_id", "action", "entity_type", "entity_id", "rationale", "before_state", "after_state"];
const ACCESS_COLS = ["timestamp", "actor_id", "actor_role", "method", "endpoint", "entity_type", "entity_id", "outcome"];

export default function LogsPage() {
  const [tab, setTab] = useState<"audit" | "access">("audit");
  const [actor, setActor] = useState("");
  const [entity, setEntity] = useState("");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type: tab });
    if (actor) params.set("actor", actor);
    if (entity) params.set("entity", entity);
    const res = await fetch(`/api/logs?${params}`);
    if (!res.ok) {
      setError((await res.json()).error ?? `Request failed (${res.status})`);
      setRows([]);
      return;
    }
    setError(null);
    setRows((await res.json()).entries);
  }, [tab, actor, entity]);

  useEffect(() => {
    load();
  }, [load]);

  const cols = tab === "audit" ? AUDIT_COLS : ACCESS_COLS;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Audit & Access Logs</h1>

      <div className="mb-4 flex gap-2 border-b border-gray-200">
        {(["audit", "access"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm ${
              tab === t
                ? "border-blue-600 font-medium text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "audit" ? "Audit log (Layer 3 — decisions)" : "Access log (Layer 2 — every request)"}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="Filter by actor id (e.g. u-maria)"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          placeholder="Filter by entity id (e.g. case-001)"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>

      {error ? (
        <p className="rounded bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 uppercase text-gray-500">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 align-top last:border-0">
                  {cols.map((c) => (
                    <td key={c} className={`max-w-xs break-words px-3 py-2 ${c === "outcome" && r[c] === "denied" ? "font-semibold text-red-600" : ""}`}>
                      {String(r[c] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length} className="px-3 py-6 text-center text-gray-400">
                    No entries match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
