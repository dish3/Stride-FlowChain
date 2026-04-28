import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-[oklch(0.85_0.2_162)]",
  warning: "text-warning",
  danger: "text-destructive",
};

export function StatCard({ icon: Icon, label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)] transition-[var(--transition-smooth)] hover:-translate-y-0.5 hover:border-primary/40">
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "var(--gradient-glow)" }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn("text-2xl font-semibold tracking-tight", toneClasses[tone])}>
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}
