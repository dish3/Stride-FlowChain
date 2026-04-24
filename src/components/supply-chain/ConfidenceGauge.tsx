import { ShieldCheck } from "lucide-react";

interface ConfidenceGaugeProps {
  value: number; // 0–100
}

export function ConfidenceGauge({ value }: ConfidenceGaugeProps) {
  const v = Math.max(0, Math.min(100, value));
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - v / 100);
  const color =
    v >= 80 ? "var(--primary)" : v >= 60 ? "var(--warning)" : "var(--destructive)";
  const label = v >= 80 ? "High confidence" : v >= 60 ? "Moderate" : "Low — review";

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1), stroke 0.3s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight" style={{ color }}>
            {v}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            %
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color }} />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            AI Confidence
          </p>
        </div>
        <p className="text-sm font-semibold" style={{ color }}>
          {label}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Stability score across urgency, risk, and disruption signals.
        </p>
      </div>
    </div>
  );
}
