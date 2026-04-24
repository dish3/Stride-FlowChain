import { Brain, Sparkles } from "lucide-react";
import type { RouteResult } from "@/lib/supply-chain";

interface AIExplanationPanelProps {
  route: RouteResult;
}

export function AIExplanationPanel({ route }: AIExplanationPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            AI Reasoning
          </h3>
        </div>
        {route.optimized && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> re-optimized
          </span>
        )}
      </div>

      <p className="mb-3 text-sm font-medium leading-relaxed text-foreground">
        {route.suggestion ?? route.explanation}
      </p>

      <ul className="space-y-2">
        {route.reasoning.map((line, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-sm leading-relaxed text-foreground/80 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
