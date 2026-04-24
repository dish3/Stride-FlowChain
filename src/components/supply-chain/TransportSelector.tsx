import { Brain, Check } from "lucide-react";
import { COST_PER_KM, CO2_PER_KM, SPEED, calculateETA, isOceanRoute, canShip, type Transport, type RouteResult } from "@/lib/supply-chain";
import { cn } from "@/lib/utils";

interface TransportSelectorProps {
  source: string;
  destination: string;
  distance: number;
  weight: number;
  selected: Transport | "auto";
  aiRecommended: Transport;
  onSelect: (t: Transport | "auto") => void;
  current: RouteResult | null;
  disabled?: boolean;
}

const MODES: { id: Transport; emoji: string; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: "Air ✈️",   emoji: "✈️", label: "Air",   color: "text-violet-400",  bgColor: "bg-violet-500/10",  borderColor: "border-violet-500/40" },
  { id: "Ship 🚢",  emoji: "🚢", label: "Ship",  color: "text-sky-400",     bgColor: "bg-sky-500/10",     borderColor: "border-sky-500/40" },
  { id: "Train 🚆", emoji: "🚆", label: "Train", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/40" },
  { id: "Truck 🚛", emoji: "🚛", label: "Truck", color: "text-amber-400",   bgColor: "bg-amber-500/10",   borderColor: "border-amber-500/40" },
];

function isViable(transport: Transport, source: string, destination: string): boolean {
  const ocean = isOceanRoute(source, destination);
  if (ocean) {
    if (transport === "Train 🚆" || transport === "Truck 🚛") return false;
    if (transport === "Ship 🚢" && !canShip(source, destination)) return false;
  }
  return true;
}

export function TransportSelector({
  source,
  destination,
  distance,
  weight,
  selected,
  aiRecommended,
  onSelect,
  current,
  disabled,
}: TransportSelectorProps) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Transport Mode
          </h3>
        </div>
        <button
          onClick={() => onSelect("auto")}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
            selected === "auto"
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary",
          )}
        >
          {selected === "auto" && <Check className="h-2.5 w-2.5" />}
          AI Auto
        </button>
      </div>

      {/* Mode selector buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {MODES.map((mode) => {
          const viable = isViable(mode.id, source, destination);
          const isSelected = selected === mode.id;
          const isAI = mode.id === aiRecommended;

          return (
            <button
              key={mode.id}
              onClick={() => viable && onSelect(mode.id)}
              disabled={disabled || !viable}
              title={!viable ? "Not viable for this route" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                isSelected
                  ? `${mode.bgColor} ${mode.borderColor} ${mode.color} shadow-sm`
                  : viable
                    ? "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:bg-secondary/50"
                    : "border-border/30 bg-secondary/10 text-muted-foreground/30 cursor-not-allowed",
              )}
            >
              <span className="text-xl leading-none">{mode.emoji}</span>
              <span>{mode.label}</span>
              {isAI && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-[var(--brand-deep)]">
                  AI
                </span>
              )}
              {!viable && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/40 text-[9px] text-muted-foreground/50">
                  N/A
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Live comparison table */}
      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mode</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">ETA</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cost</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">CO₂</th>
            </tr>
          </thead>
          <tbody>
            {MODES.map((mode) => {
              const viable = isViable(mode.id, source, destination);
              const eta = calculateETA(distance, mode.id);
              const cost = Math.round(distance * COST_PER_KM[mode.id]);
              const co2 = +(distance * CO2_PER_KM[mode.id]).toFixed(1);
              const isSelected = selected === mode.id || (selected === "auto" && mode.id === aiRecommended);
              const isAI = mode.id === aiRecommended;

              // Find best values for highlighting
              const viableModes = MODES.filter((m) => isViable(m.id, source, destination));
              const bestEta = Math.min(...viableModes.map((m) => calculateETA(distance, m.id)));
              const bestCost = Math.min(...viableModes.map((m) => Math.round(distance * COST_PER_KM[m.id])));
              const bestCo2 = Math.min(...viableModes.map((m) => +(distance * CO2_PER_KM[m.id]).toFixed(1)));

              return (
                <tr
                  key={mode.id}
                  onClick={() => viable && onSelect(mode.id)}
                  className={cn(
                    "border-b border-border/40 last:border-0 transition-colors",
                    viable ? "cursor-pointer" : "opacity-30",
                    isSelected ? `${mode.bgColor}` : viable ? "hover:bg-secondary/20" : "",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span>{mode.emoji}</span>
                      <span className={cn("font-medium", isSelected ? mode.color : "text-foreground/70")}>
                        {mode.label}
                      </span>
                      {isAI && (
                        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                          AI
                        </span>
                      )}
                      {!viable && (
                        <span className="text-[9px] text-muted-foreground/50">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className={cn("px-3 py-2.5 text-right font-mono", eta === bestEta && viable ? "text-emerald-400 font-semibold" : "text-foreground/70")}>
                    {viable ? `${eta}h` : "—"}
                  </td>
                  <td className={cn("px-3 py-2.5 text-right font-mono", cost === bestCost && viable ? "text-emerald-400 font-semibold" : "text-foreground/70")}>
                    {viable ? `₹${cost.toLocaleString()}` : "—"}
                  </td>
                  <td className={cn("px-3 py-2.5 text-right font-mono", co2 === bestCo2 && viable ? "text-emerald-400 font-semibold" : "text-foreground/70")}>
                    {viable ? `${co2}kg` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        <span className="text-emerald-400 font-semibold">Green</span> = best value · Click any row or button to switch mode · N/A = not viable for this route
      </p>
    </div>
  );
}
