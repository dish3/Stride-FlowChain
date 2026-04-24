import { CloudRain, RotateCcw, TrafficCone } from "lucide-react";
import type { Intensity } from "@/lib/supply-chain";
import { cn } from "@/lib/utils";

const LEVELS: Array<{ value: Intensity; label: string }> = [
  { value: 0, label: "None" },
  { value: 1, label: "Low" },
  { value: 2, label: "Med" },
  { value: 3, label: "High" },
];

interface WhatIfControlsProps {
  traffic: Intensity;
  rain: Intensity;
  onChange: (next: { traffic: Intensity; rain: Intensity }) => void;
  disabled?: boolean;
}

export function WhatIfControls({ traffic, rain, onChange, disabled }: WhatIfControlsProps) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          What-if Simulation
        </h3>
        <button
          type="button"
          onClick={() => onChange({ traffic: 0, rain: 0 })}
          disabled={disabled || (traffic === 0 && rain === 0)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" /> reset
        </button>
      </div>

      <ScenarioRow
        icon={<TrafficCone className="h-4 w-4 text-warning" />}
        label="Traffic"
        value={traffic}
        onChange={(v) => onChange({ traffic: v, rain })}
        disabled={disabled}
      />
      <div className="my-4 h-px bg-border/60" />
      <ScenarioRow
        icon={<CloudRain className="h-4 w-4 text-[oklch(0.75_0.13_220)]" />}
        label="Rain"
        value={rain}
        onChange={(v) => onChange({ traffic, rain: v })}
        disabled={disabled}
      />
    </div>
  );
}

function ScenarioRow({
  icon,
  label,
  value,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  value: Intensity;
  onChange: (v: Intensity) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-medium">{label}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {LEVELS[value].label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {LEVELS.map((lvl) => {
          const active = lvl.value === value;
          return (
            <button
              key={lvl.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(lvl.value)}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-xs font-medium transition-[var(--transition-smooth)]",
                active
                  ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_1px_var(--primary)_inset]"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                disabled && "opacity-50",
              )}
            >
              {lvl.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
