import { Brain, Check } from "lucide-react";
import { COST_PER_KM, CO2_PER_KM, calculateETA, isOceanRoute, canShip, type Transport } from "@/lib/supply-chain";
import { cn } from "@/lib/utils";

interface TransportSelectorProps {
  source: string;
  destination: string;
  distance: number;
  selected: Transport | "auto";
  aiRecommended: Transport;
  onSelect: (t: Transport | "auto") => void;
  disabled?: boolean;
}

const MODES: { id: Transport; emoji: string; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: "Air ✈️",   emoji: "✈️", label: "Air",   color: "text-blue-400",    bgColor: "bg-blue-500/10",    borderColor: "border-blue-500/40" },
  { id: "Ship 🚢",  emoji: "🚢", label: "Ship",  color: "text-cyan-400",    bgColor: "bg-cyan-500/10",    borderColor: "border-cyan-500/40" },
  { id: "Train 🚆", emoji: "🚆", label: "Train", color: "text-green-400",   bgColor: "bg-green-500/10",   borderColor: "border-green-500/40" },
  { id: "Truck 🚛", emoji: "🚛", label: "Truck", color: "text-yellow-400",  bgColor: "bg-yellow-500/10",  borderColor: "border-yellow-500/40" },
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
  selected,
  aiRecommended,
  onSelect,
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
                "relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all duration-200",
                isSelected
                  ? `${mode.bgColor} ${mode.borderColor} ${mode.color} shadow-lg border-2`
                  : viable
                    ? `border-border/50 bg-secondary/20 text-muted-foreground hover:border-primary/50 hover:bg-secondary/40 hover:${mode.color}`
                    : "border-border/20 bg-secondary/10 text-muted-foreground/40 cursor-not-allowed opacity-50",
              )}
            >
              <span className="text-2xl leading-none">{mode.emoji}</span>
              <span className="text-[11px] font-semibold">{mode.label}</span>
              {isAI && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow-md">
                  AI
                </span>
              )}
              {!viable && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50 text-[9px] text-muted-foreground/60 font-semibold">
                  N/A
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Live comparison table */}
      <div className="overflow-hidden rounded-xl border-2 border-border/60 bg-secondary/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-border/60 bg-secondary/40">
              <th className="px-3 py-2.5 text-left font-semibold text-foreground">Mode</th>
              <th className="px-3 py-2.5 text-right font-semibold text-foreground">ETA</th>
              <th className="px-3 py-2.5 text-right font-semibold text-foreground">Cost</th>
              <th className="px-3 py-2.5 text-right font-semibold text-foreground">CO₂</th>
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
                    "border-b border-border/40 last:border-0 transition-colors duration-150",
                    viable ? "cursor-pointer" : "opacity-40",
                    isSelected ? `${mode.bgColor} border-l-4 ${mode.borderColor}` : viable ? "hover:bg-secondary/30" : "",
                  )}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{mode.emoji}</span>
                      <span className={cn("font-semibold", isSelected ? mode.color : "text-foreground")}>
                        {mode.label}
                      </span>
                      {isAI && (
                        <span className="rounded-full bg-primary/30 px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary">
                          AI
                        </span>
                      )}
                      {!viable && (
                        <span className="text-[8px] text-muted-foreground/50 font-semibold">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className={cn("px-3 py-3 text-right font-mono font-semibold", eta === bestEta && viable ? "text-green-400" : "text-foreground/70")}>
                    {viable ? `${eta}h` : "—"}
                  </td>
                  <td className={cn("px-3 py-3 text-right font-mono font-semibold", cost === bestCost && viable ? "text-green-400" : "text-foreground/70")}>
                    {viable ? `₹${cost.toLocaleString()}` : "—"}
                  </td>
                  <td className={cn("px-3 py-3 text-right font-mono font-semibold", co2 === bestCo2 && viable ? "text-green-400" : "text-foreground/70")}>
                    {viable ? `${co2}kg` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground/80 font-medium">
        <span className="text-green-400 font-bold">Green</span> = best value · Click any row to switch · <span className="text-primary font-bold">AI</span> = recommended
      </p>
    </div>
  );
}
