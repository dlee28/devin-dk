"use client";

// THIN APP: pages + components only. All governance (RBAC + access logging)
// is inherited from the platform layer via the /api routes this page calls.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RiskBadge, StatusBadge, formatDate } from "./ui";

interface CaseRow {
  id: string;
  customer_name: string;
  country: string;
  document_type: string;
  risk_score: number;
  status: string;
  assignee_name: string | null;
  created_at: string;
}

const STATUSES = ["all", "pending", "in_review", "approved", "rejected"] as const;

export default function QueuePage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<"created_at" | "risk_score">("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cases?status=${status}&sort=${sort}&dir=${dir}`);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to load cases");
      return;
    }
    const data = await res.json();
    setCases(data.cases);
    setCounts(
      Object.fromEntries(data.counts.map((c: { status: string; n: number }) => [c.status, c.n]))
    );
    setError(null);
  }, [status, sort, dir]);

  useEffect(() => {
    load();
  }, [load]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const toggleSort = (col: "created_at" | "risk_score") => {
    if (sort === col) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSort(col);
      setDir("desc");
    }
  };
  const arrow = (col: string) => (sort === col ? (dir === "desc" ? " ↓" : " ↑") : "");

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">KYC Review Queue</h1>
      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mb-4 flex gap-2 border-b border-gray-200">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`border-b-2 px-3 py-2 text-sm ${
              status === s
                ? "border-blue-600 font-medium text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {s.replace("_", " ")} ({s === "all" ? total : counts[s] ?? 0})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Document</th>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("risk_score")}>
                Risk{arrow("risk_score")}
              </th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("created_at")}>
                Created{arrow("created_at")}
              </th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/kyc/${c.id}`)}
                className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-blue-50"
              >
                <td className="px-4 py-3 font-medium">{c.customer_name}</td>
                <td className="px-4 py-3">{c.country}</td>
                <td className="px-4 py-3">{c.document_type.replace("_", " ")}</td>
                <td className="px-4 py-3">
                  <RiskBadge score={c.risk_score} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3">{c.assignee_name ?? <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(c.created_at)}</td>
              </tr>
            ))}
            {cases.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No cases in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
