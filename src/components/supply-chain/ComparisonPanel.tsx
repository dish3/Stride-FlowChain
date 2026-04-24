import { ArrowRight } from "lucide-react";
import type { RouteResult } from "@/lib/supply-chain";

interface ComparisonPanelProps {
  before: RouteResult;
  after: RouteResult;
}

export function ComparisonPanel({ before, after }: ComparisonPanelProps) {
  const rows: Array<{ label: string; b: string; a: string; better: boolean }> = [
    {
      label: "Transport",
      b: before.transport,
      a: after.transport,
      better: before.transport !== after.transport,
    },
    {
      label: "ETA",
      b: `${before.eta} h`,
      a: `${after.eta} h`,
      better: after.eta < before.eta,
    },
    {
      label: "Risk",
      b: before.risk,
      a: after.risk,
      better: after.risk === "Low" && before.risk !== "Low",
    },
    {
      label: "Cost",
      b: `₹${before.cost.toLocaleString()}`,
      a: `₹${after.cost.toLocaleString()}`,
      better: after.cost <= before.cost,
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)] animate-fade-up">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Before vs After Optimization
        </h3>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
          AI re-routed
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-3 py-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{r.label}</span>
              <span className="font-medium text-foreground/80">{r.b}</span>
            </div>
            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                r.better
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/60 bg-secondary/30"
              }`}
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{r.label}</span>
              <span className={`font-semibold ${r.better ? "text-primary" : "text-foreground"}`}>
                {r.a}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
