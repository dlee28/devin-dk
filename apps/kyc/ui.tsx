// Small shared presentational helpers for the KYC app.

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RiskBadge({ score }: { score: number }) {
  // Visually flag high-risk cases (score >= 70).
  const cls =
    score >= 70
      ? "bg-red-100 text-red-800 ring-1 ring-red-300"
      : score >= 40
        ? "bg-yellow-100 text-yellow-800"
        : "bg-green-100 text-green-800";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {score}
      {score >= 70 ? " ⚠" : ""}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
