import { Clock, DollarSign, Leaf, TrendingDown, TrendingUp } from "lucide-react";
import type { RouteResult } from "@/lib/supply-chain";
import { cn } from "@/lib/utils";

interface ImpactPanelProps {
  before: RouteResult;
  after: RouteResult;
}

export function ImpactPanel({ before, after }: ImpactPanelProps) {
  const timeSavedPct = before.eta > 0 ? ((before.eta - after.eta) / before.eta) * 100 : 0;
  const costDelta = after.cost - before.cost;
  const co2Pct = before.co2 > 0 ? ((before.co2 - after.co2) / before.co2) * 100 : 0;

  const items = [
    {
      icon: Clock,
      label: "Time saved",
      value: `${timeSavedPct >= 0 ? "+" : ""}${timeSavedPct.toFixed(1)}%`,
      hint: `${(before.eta - after.eta).toFixed(1)}h faster`,
      good: timeSavedPct > 0,
    },
    {
      icon: DollarSign,
      label: "Cost change",
      value: `${costDelta >= 0 ? "+" : "−"}₹${Math.abs(costDelta).toLocaleString()}`,
      hint: costDelta <= 0 ? "Savings vs disrupted plan" : "Premium for speed",
      good: costDelta <= 0,
    },
    {
      icon: Leaf,
      label: "CO₂ reduction",
      value: `${co2Pct >= 0 ? "−" : "+"}${Math.abs(co2Pct).toFixed(1)}%`,
      hint: `${Math.abs(before.co2 - after.co2).toFixed(1)} kg ${co2Pct >= 0 ? "saved" : "added"}`,
      good: co2Pct >= 0,
    },
  ];

  return (
    <div className="rounded-2xl border border-primary/30 bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-glow)] animate-fade-up">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
          Optimization Impact
        </h3>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
          AI delivered
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((it) => {
          const TrendIcon = it.good ? TrendingUp : TrendingDown;
          return (
            <div
              key={it.label}
              className={cn(
                "rounded-xl border p-3",
                it.good ? "border-primary/40 bg-primary/10" : "border-warning/40 bg-warning/10",
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <it.icon className={cn("h-4 w-4", it.good ? "text-primary" : "text-warning")} />
                <TrendIcon className={cn("h-3.5 w-3.5", it.good ? "text-primary" : "text-warning")} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {it.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold tracking-tight",
                  it.good ? "text-primary" : "text-warning",
                )}
              >
                {it.value}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{it.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
