import type { Risk } from "@/lib/supply-chain";

export function RiskBadge({ risk }: { risk: Risk }) {
  const styles: Record<Risk, string> = {
    Low: "border-primary/40 bg-primary/10 text-primary",
    Medium: "border-warning/40 bg-warning/10 text-warning",
    High: "border-destructive/40 bg-destructive/10 text-destructive",
  };
  const hints: Record<Risk, string> = {
    Low: "Route conditions are stable",
    Medium: "Some uncertainty — monitor conditions",
    High: "Significant risk — consider optimizing",
  };
  return (
    <span
      id={`risk-badge-${risk.toLowerCase()}`}
      title={hints[risk]}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[risk]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${risk === "Low" ? "bg-primary" : risk === "Medium" ? "bg-warning" : "bg-destructive"} ${risk === "High" ? "animate-pulse" : ""}`} />
      {risk} risk
    </span>
  );
}
