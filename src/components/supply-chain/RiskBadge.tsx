import type { Risk } from "@/lib/supply-chain";
import { cn } from "@/lib/utils";

const styles: Record<Risk, string> = {
  Low: "bg-[oklch(0.85_0.18_162_/_18%)] text-[oklch(0.85_0.2_162)] border-[oklch(0.85_0.2_162_/_40%)]",
  Medium: "bg-warning/15 text-warning border-warning/40",
  High: "bg-destructive/15 text-destructive border-destructive/40",
};

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[risk],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", risk === "Low" ? "bg-[oklch(0.85_0.2_162)] animate-pulse-ring" : risk === "Medium" ? "bg-warning" : "bg-destructive")} />
      {risk} Risk
    </span>
  );
}
