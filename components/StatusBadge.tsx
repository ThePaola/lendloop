import { STATUS_LABELS } from "@/lib/labels";

const COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  approved: "bg-green-500/15 text-green-600",
  declined: "bg-red-500/15 text-red-600",
  cancelled: "bg-zinc-500/15 text-zinc-500",
  returned: "bg-blue-500/15 text-blue-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? ""}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}