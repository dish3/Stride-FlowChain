import { Brain, CheckCircle2, Circle, Loader2, Package, Sparkles, TrendingUp, Zap } from "lucide-react";
import type { DecisionStep } from "@/lib/supply-chain";
import { cn } from "@/lib/utils";

const ICONS = {
  shipment: Package,
  ai: Brain,
  disruption: Zap,
  predict: TrendingUp,
  optimize: Sparkles,
} as const;

export function DecisionTimeline({ steps }: { steps: DecisionStep[] }) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Decision Timeline
        </h3>
      </div>
      <ol className="relative space-y-4 pl-2">
        {steps.map((step, i) => {
          const Icon = ICONS[step.icon];
          const isLast = i === steps.length - 1;
          return (
            <li key={step.id} className="relative flex gap-3">
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-8px)] w-px",
                    step.status === "done" ? "bg-primary/60" : "bg-border",
                  )}
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-[var(--transition-smooth)]",
                  step.status === "done" && "border-primary/50 bg-primary/15 text-primary",
                  step.status === "active" && "border-primary bg-primary text-[var(--brand-deep)] animate-pulse-ring",
                  step.status === "pending" && "border-border bg-secondary/40 text-muted-foreground",
                )}
              >
                {step.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step.status === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      step.status === "pending" ? "text-muted-foreground" : "text-primary",
                    )}
                  />
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.status === "pending" ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.status === "active" && (
                    <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                      now
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
              {step.status === "done" && (
                <Circle className="hidden h-2 w-2 fill-primary text-primary" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
