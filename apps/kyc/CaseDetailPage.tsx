"use client";

// THIN APP: pages + components only. This page never checks roles - it always
// offers the actions and lets the platform-governed API accept or deny them
// (the API is the source of truth; denials are logged as Layer-2 events).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RiskBadge, StatusBadge, formatDate } from "./ui";

interface CaseDetail {
  id: string;
  customer_name: string;
  customer_email: string;
  date_of_birth: string;
  country: string;
  document_type: string;
  risk_score: number;
  status: string;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by_name: string | null;
}

interface Note {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface HistoryEntry {
  id: number;
  actor_id: string;
  action: string;
  before_state: string;
  after_state: string;
  rationale: string | null;
  timestamp: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function CaseDetailPage({ caseId }: { caseId: string }) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rationale, setRationale] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cases/${caseId}`);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to load case");
      return;
    }
    const data = await res.json();
    setDetail(data.case);
    setNotes(data.notes);
    setHistory(data.history);
  }, [caseId]);

  useEffect(() => {
    load();
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d) => setUsers(d.users ?? []));
  }, [load]);

  const act = async (path: string, body: Record<string, unknown>, okMessage: string) => {
    setError(null);
    setMessage(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? `Request failed (${res.status})`);
    } else {
      setMessage(okMessage);
      setRationale("");
      await load();
    }
  };

  if (!detail) {
    return (
      <div>
        <Link href="/kyc" className="text-sm text-blue-600 hover:underline">← Back to queue</Link>
        <p className="mt-4 text-gray-500">{error ?? "Loading…"}</p>
      </div>
    );
  }

  const decidable = detail.status === "pending" || detail.status === "in_review";
  const decided = detail.status === "approved" || detail.status === "rejected";

  return (
    <div>
      <Link href="/kyc" className="text-sm text-blue-600 hover:underline">← Back to queue</Link>
      <div className="mt-2 mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{detail.customer_name}</h1>
        <StatusBadge status={detail.status} />
        <RiskBadge score={detail.risk_score} />
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">{message}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Case details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-gray-500">Case ID</dt><dd>{detail.id}</dd>
              <dt className="text-gray-500">Email</dt><dd>{detail.customer_email}</dd>
              <dt className="text-gray-500">Date of birth</dt><dd>{detail.date_of_birth}</dd>
              <dt className="text-gray-500">Country</dt><dd>{detail.country}</dd>
              <dt className="text-gray-500">Document type</dt><dd>{detail.document_type.replace("_", " ")}</dd>
              <dt className="text-gray-500">Assignee</dt><dd>{detail.assignee_name ?? "Unassigned"}</dd>
              <dt className="text-gray-500">Created</dt><dd>{formatDate(detail.created_at)}</dd>
              <dt className="text-gray-500">Decided</dt>
              <dd>{detail.decided_at ? `${formatDate(detail.decided_at)} by ${detail.decided_by_name}` : "—"}</dd>
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Notes</h2>
            <ul className="mb-4 space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded bg-gray-50 p-3 text-sm">
                  <div className="mb-1 text-xs text-gray-500">
                    {n.author_name} · {formatDate(n.created_at)}
                  </div>
                  {n.body}
                </li>
              ))}
              {notes.length === 0 && <li className="text-sm text-gray-400">No notes yet.</li>}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(`/api/cases/${caseId}/notes`, { body: noteBody }, "Note added.");
                setNoteBody("");
              }}
              className="flex gap-2"
            >
              <input
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add a note…"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <button className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
                Add
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-semibold">Case history</h2>
            <p className="mb-3 text-xs text-gray-500">
              Domain audit trail (Layer 3) for this case — traceable justification for every decision.
            </p>
            <ul className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="rounded border border-gray-100 bg-gray-50 p-3 text-sm">
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{h.action}</span>
                    <span>{h.actor_id} · {formatDate(h.timestamp)}</span>
                  </div>
                  {h.rationale && <p className="mb-1 italic">“{h.rationale}”</p>}
                  <p className="font-mono text-xs text-gray-500">
                    {h.before_state} → {h.after_state}
                  </p>
                </li>
              ))}
              {history.length === 0 && <li className="text-sm text-gray-400">No history yet.</li>}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-semibold">Decision</h2>
            <p className="mb-3 text-xs text-gray-500">
              A written rationale (min 10 characters) is required — enforced server-side.
            </p>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Rationale for this action…"
              rows={4}
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            {decidable && (
              <div className="flex gap-2">
                <button
                  onClick={() => act(`/api/cases/${caseId}/decision`, { decision: "approved", rationale }, "Case approved.")}
                  className="flex-1 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => act(`/api/cases/${caseId}/decision`, { decision: "rejected", rationale }, "Case rejected.")}
                  className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
            {decided && (
              <button
                onClick={() => act(`/api/cases/${caseId}/override`, { rationale }, "Decision overridden; case reopened.")}
                className="w-full rounded bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800"
              >
                Override decision (admin)
              </button>
            )}
            {!decidable && !decided && (
              <p className="text-sm text-gray-400">No decision available in this status.</p>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Reassign (admin)</h2>
            <div className="flex gap-2">
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="flex-1 rounded border border-gray-300 px-2 py-2 text-sm"
              >
                <option value="">Select reviewer…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <button
                onClick={() => assignee && act(`/api/cases/${caseId}/reassign`, { assigned_to: assignee }, "Case reassigned.")}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Reassign
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
