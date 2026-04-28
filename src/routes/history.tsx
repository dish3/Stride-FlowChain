import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@/lib/api";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Loader2,
  MapPin,
  Package,
  Plane,
  Route as RouteIcon,
  Ship,
  Target,
  TrainFront,
  Trash2,
  Truck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CITIES } from "@/lib/supply-chain";
import type { ShipmentRow, DashboardStats } from "@/lib/db";
import {
  getShipments,
  getDashboardStats,
  deleteShipment,
} from "@/lib/api";

export const Route = createFileRoute("/history" as never)({
  head: () => ({
    meta: [
      { title: "FlowChain — Shipment History" },
      {
        name: "description",
        content:
          "View all past shipments, analytics, and route history for your FlowChain logistics operations.",
      },
    ],
  }),
  component: HistoryPage,
});

const PAGE_SIZE = 10;

function HistoryPage() {
  const fetchShipments = useServerFn(getShipments);
  const fetchStats = useServerFn(getDashboardStats);
  const deleteFn = useServerFn(deleteShipment);

  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(
    (pageNum = 0) => {
      startTransition(async () => {
        try {
          const [shipRes, statsRes] = await Promise.all([
            fetchShipments({
              data: { limit: PAGE_SIZE, offset: pageNum * PAGE_SIZE },
            }),
            fetchStats(),
          ]);
          setShipments(shipRes.shipments);
          setTotal(shipRes.total);
          setStats(statsRes);
          setPage(pageNum);
        } catch (err) {
          console.error("[History] Load failed:", err);
        } finally {
          setLoaded(true);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteFn({ data: { id } });
        load(page);
      } catch (err) {
        console.error("[History] Delete failed:", err);
      } finally {
        setDeletingId(null);
      }
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main
      className="min-h-screen text-foreground"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{ background: "var(--gradient-glow)" }}
      />

      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="group flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/40 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
              aria-label="Back to dashboard"
              id="back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: "var(--gradient-mint)" }}
                >
                  <Truck
                    className="h-4 w-4 text-[var(--brand-deep)]"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse-ring" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-tight">
                  FlowChain
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Shipment History
                </p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              to="/"
              className="rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              id="nav-dashboard"
            >
              Dashboard
            </Link>
            <span className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              History
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Title */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BarChart3 className="h-3 w-3" />
            Database · Cloudflare D1
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Shipment{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-mint)" }}
            >
              History
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every route planned is saved to your Cloudflare D1 database. Review
            past decisions and analytics.
          </p>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 animate-fade-up">
            <StatBox
              icon={Package}
              label="Total Shipments"
              value={stats.totalShipments.toString()}
            />
            <StatBox
              icon={RouteIcon}
              label="Total Distance"
              value={`${(stats.totalDistance / 1000).toFixed(0)}K km`}
            />
            <StatBox
              icon={DollarSign}
              label="Total Cost"
              value={`₹${(stats.totalCost / 1000).toFixed(0)}K`}
            />
            <StatBox
              icon={Clock}
              label="Avg ETA"
              value={`${stats.avgEta}h`}
            />
            <StatBox
              icon={Target}
              label="Avg Confidence"
              value={`${stats.avgConfidence}%`}
            />
          </div>
        )}

        {/* Analytics row */}
        {stats &&
          (stats.topRoutes.length > 0 ||
            stats.transportBreakdown.length > 0) && (
            <div className="mb-8 grid gap-4 lg:grid-cols-2 animate-fade-up">
              {/* Top routes */}
              {stats.topRoutes.length > 0 && (
                <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
                  <div className="mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">
                      Top Routes
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {stats.topRoutes.map((r, i) => (
                      <div
                        key={`${r.source}-${r.destination}`}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/20 text-[10px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="font-medium">
                            {CITIES[r.source]?.label ?? r.source}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">
                            {CITIES[r.destination]?.label ?? r.destination}
                          </span>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {r.count}×
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transport breakdown */}
              {stats.transportBreakdown.length > 0 && (
                <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
                  <div className="mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">
                      Transport Breakdown
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {stats.transportBreakdown.map((t) => {
                      const pct =
                        stats.totalShipments > 0
                          ? Math.round(
                              (t.count / stats.totalShipments) * 100,
                            )
                          : 0;
                      return (
                        <div key={t.transport} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <TransportIcon transport={t.transport} />
                              <span className="font-medium">{t.transport}</span>
                            </span>
                            <span className="text-muted-foreground">
                              {t.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: "var(--gradient-mint)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Shipments table */}
        <div className="rounded-2xl border border-border bg-[var(--gradient-card)] shadow-[var(--shadow-card)] animate-fade-up">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                All Shipments
              </h2>
              <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {total}
              </span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => load(page - 1)}
                  disabled={page === 0 || pending}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-40"
                  id="prev-page-btn"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 text-xs text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => load(page + 1)}
                  disabled={page >= totalPages - 1 || pending}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-40"
                  id="next-page-btn"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Loading state */}
          {pending && !loaded ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : shipments.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "var(--gradient-mint)" }}
              >
                <Package className="h-6 w-6 text-[var(--brand-deep)]" />
              </div>
              <div>
                <p className="text-sm font-semibold">No shipments yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Plan your first route and it will appear here automatically.
                </p>
              </div>
              <Link to="/">
                <Button
                  className="h-9 font-semibold text-[var(--brand-deep)] shadow-[var(--shadow-glow)]"
                  style={{ background: "var(--gradient-mint)" }}
                  id="plan-first-route-btn"
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Plan First Route
                </Button>
              </Link>
            </div>
          ) : (
            /* Table */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Route</th>
                    <th className="px-3 py-3 font-medium">Transport</th>
                    <th className="px-3 py-3 font-medium text-right">
                      Distance
                    </th>
                    <th className="px-3 py-3 font-medium text-right">ETA</th>
                    <th className="px-3 py-3 font-medium text-right">Cost</th>
                    <th className="px-3 py-3 font-medium text-right">CO₂</th>
                    <th className="px-3 py-3 font-medium text-center">Risk</th>
                    <th className="px-3 py-3 font-medium text-center">
                      Confidence
                    </th>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s, i) => (
                    <tr
                      key={s.id}
                      className="group border-b border-border/20 transition-colors hover:bg-secondary/20"
                      style={{
                        animationDelay: `${i * 40}ms`,
                        animation: "fadeUp 0.3s ease-out both",
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {CITIES[s.source]?.label ?? s.source}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">
                            {CITIES[s.destination]?.label ?? s.destination}
                          </span>
                          {s.ocean_route === 1 && (
                            <span className="text-[10px] text-blue-400">🌊</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {s.weight.toLocaleString()} kg · {s.urgency} urgency
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-secondary/30 px-2 py-0.5 text-xs">
                          <TransportIcon transport={s.transport} />
                          {s.transport.split(" ")[0]}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums">
                        {s.distance.toLocaleString()} km
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums">
                        {s.eta}h
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums">
                        ₹{s.cost.toLocaleString()}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums">
                        {s.co2} kg
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <RiskPill risk={s.risk} />
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            s.confidence >= 80
                              ? "text-emerald-400"
                              : s.confidence >= 60
                                ? "text-amber-400"
                                : "text-red-400"
                          }`}
                        >
                          {s.confidence}%
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(s.created_at)}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-40"
                          aria-label={`Delete shipment ${s.id}`}
                          id={`delete-${s.id}`}
                        >
                          {deletingId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 md:flex-row md:justify-between md:px-8">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              FlowChain v1.0
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Powered by Cloudflare D1
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <span>SQLite at the edge</span>
            <span>·</span>
            <span>Zero-latency queries</span>
            <span>·</span>
            <span>{total} shipments stored</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-4 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function RiskPill({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    Low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    Medium: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    High: "border-red-500/40 bg-red-500/10 text-red-400",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${colors[risk] ?? colors.Low}`}
    >
      {risk}
    </span>
  );
}

function TransportIcon({ transport }: { transport: string }) {
  const cls = "h-3 w-3";
  if (transport.includes("Air")) return <Plane className={cls} />;
  if (transport.includes("Ship")) return <Ship className={cls} />;
  if (transport.includes("Train")) return <TrainFront className={cls} />;
  return <Truck className={cls} />;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
