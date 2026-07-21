"use client";

// THIN APP: per-application settings page. Admin controls (role visibility,
// linked database) and per-user customizable options. All enforcement is
// server-side via /api/apps/[key]/settings and /api/apps/[key]/prefs.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";
import { AppIcon } from "@/platform/appIcons";

interface PrefDef {
  key: string;
  label: string;
  type: "select" | "boolean";
  options?: string[];
  default: string | boolean;
}

interface SettingsPayload {
  app: { key: string; name: string; description: string; icon: string };
  settings: {
    visible_to_roles: string[];
    linked_database: string;
    customizable: PrefDef[];
    updated_at: string;
    updated_by: string | null;
  };
  databases: string[];
  roles: string[];
  canManage: boolean;
}

export default function AppSettingsPage({ appKey }: { appKey: string }) {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [visibleRoles, setVisibleRoles] = useState<string[]>([]);
  const [database, setDatabase] = useState("");
  const [prefs, setPrefs] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [settingsRes, prefsRes] = await Promise.all([
      fetch(`/api/apps/${appKey}/settings`),
      fetch(`/api/apps/${appKey}/prefs`),
    ]);
    if (!settingsRes.ok) {
      setError((await settingsRes.json()).error ?? "Failed to load settings");
      return;
    }
    const payload = (await settingsRes.json()) as SettingsPayload;
    setData(payload);
    setVisibleRoles(payload.settings.visible_to_roles);
    setDatabase(payload.settings.linked_database);
    if (prefsRes.ok) setPrefs((await prefsRes.json()).prefs);
    setError(null);
  }, [appKey]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRole = (role: string) =>
    setVisibleRoles((rs) => (rs.includes(role) ? rs.filter((r) => r !== role) : [...rs, role]));

  const saveAdmin = async () => {
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/apps/${appKey}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible_to_roles: visibleRoles, linked_database: database }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? `Request failed (${res.status})`);
      return;
    }
    setNotice("Application settings saved.");
    await load();
  };

  const savePrefs = async () => {
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/apps/${appKey}/prefs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? `Request failed (${res.status})`);
      return;
    }
    setNotice("Your preferences were saved.");
  };

  if (!data) {
    return (
      <div>
        {error ? (
          <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to launcher
      </Link>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold">
        <AppIcon icon={data.app.icon} className="h-6 w-6 text-blue-600" /> {data.app.name} — Settings
      </h1>
      <p className="mb-6 text-sm text-gray-500">{data.app.description}</p>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Application settings (admin)</h2>
        <p className="mb-4 text-sm text-gray-500">
          Who can see this application and which database it reads from. Enforced by the platform layer.
        </p>

        <div className="mb-4">
          <div className="mb-1 text-sm font-medium">Visible to roles</div>
          {data.roles.map((role) => (
            <label key={role} className="mr-4 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visibleRoles.includes(role)}
                onChange={() => toggleRole(role)}
                disabled={!data.canManage}
              />
              {role}
            </label>
          ))}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium" htmlFor="linked-db">
            Linked database
          </label>
          <select
            id="linked-db"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            disabled={!data.canManage}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {data.databases.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={saveAdmin}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Save application settings
        </button>
        {!data.canManage && (
          <p className="mt-2 text-xs text-gray-400">Saving requires the admin role (server-enforced).</p>
        )}
        {data.canManage && (
          <p className="mt-3 text-sm">
            <Link
              href={`/logs/${appKey}`}
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              <ScrollText className="h-4 w-4" aria-hidden="true" /> View this application&apos;s audit &amp; access logs
            </Link>
          </p>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Your preferences</h2>
        <p className="mb-4 text-sm text-gray-500">
          Options this application lets each user customize. Saved for your user only.
        </p>
        {data.settings.customizable.length === 0 ? (
          <p className="text-sm text-gray-400">This application has no user-customizable options.</p>
        ) : (
          <>
            {data.settings.customizable.map((def) => (
              <div key={def.key} className="mb-3">
                {def.type === "boolean" ? (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={prefs[def.key] === true}
                      onChange={(e) => setPrefs((p) => ({ ...p, [def.key]: e.target.checked }))}
                    />
                    {def.label}
                  </label>
                ) : (
                  <>
                    <label className="mb-1 block text-sm font-medium" htmlFor={`pref-${def.key}`}>
                      {def.label}
                    </label>
                    <select
                      id={`pref-${def.key}`}
                      value={String(prefs[def.key] ?? def.default)}
                      onChange={(e) => setPrefs((p) => ({ ...p, [def.key]: e.target.value }))}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      {def.options?.map((o) => (
                        <option key={o} value={o}>
                          {o.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            ))}
            <button
              onClick={savePrefs}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save my preferences
            </button>
          </>
        )}
      </section>
    </div>
  );
}
