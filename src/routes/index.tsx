import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@/lib/api";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  Anchor,
  ArrowLeftRight,
  CloudRain,
  Construction,
  DollarSign,
  Leaf,
  Loader2,
  MapPin,
  Package,
  Route as RouteIcon,
  Sparkles,
  Timer,
  TrafficCone,
  Truck,
  Waves,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CITY_REGIONS,
  citiesByRegion,
  CITIES,
  decideTransport,
  haversineKm,
  type Disruption,
  type Intensity,
  type RouteResult,
  type Transport,
  type Urgency,
} from "@/lib/supply-chain";
import {
  applyWhatIf,
  optimizeRoute,
  planRoute,
  planRouteWithTransport,
  simulateDisruption,
} from "@/lib/api";
import { saveShipment, logAnalyticsEvent } from "@/lib/api";
import { MapView } from "@/components/supply-chain/MapView";
import { StatCard } from "@/components/supply-chain/StatCard";
import { RiskBadge } from "@/components/supply-chain/RiskBadge";
import { ComparisonPanel } from "@/components/supply-chain/ComparisonPanel";
import { DecisionTimeline } from "@/components/supply-chain/DecisionTimeline";
import { WhatIfControls } from "@/components/supply-chain/WhatIfControls";
import { ConfidenceGauge } from "@/components/supply-chain/ConfidenceGauge";
import { ImpactPanel } from "@/components/supply-chain/ImpactPanel";
import { AIExplanationPanel } from "@/components/supply-chain/AIExplanationPanel";
import { AssistantPanel } from "@/components/supply-chain/AssistantPanel";
import { TransportSelector } from "@/components/supply-chain/TransportSelector";
import { WeatherWidget } from "@/components/supply-chain/WeatherWidget";
import {
  type AssistantMessage,
  disruptionMessages,
  introMessage,
  optimizeMessages,
  planMessages,
  whatIfMessage,
} from "@/lib/assistant";

export const Route = createFileRoute("/" as never)({
  head: () => ({
    meta: [
      { title: "FlowChain — AI Smart Supply Chain" },
      { name: "description", content: "AI-powered logistics planner with live route optimization, disruption simulation, and instant re-routing." },
      { property: "og:title", content: "FlowChain — AI Smart Supply Chain" },
      { property: "og:description", content: "Plan, simulate, and optimize freight routes globally with AI-driven decisions." },
    ],
  }),
  component: Index,
});

const DEMO_SOURCE = "Mumbai";
const DEMO_DESTINATION = "Dubai";
const DEMO_WEIGHT = 800;
const DEMO_URGENCY: Urgency = "High";

function Index() {
  const router = useRouter();
  const planFn = useServerFn(planRoute);
  const planWithTransportFn = useServerFn(planRouteWithTransport);
  const simulateFn = useServerFn(simulateDisruption);
  const optimizeFn = useServerFn(optimizeRoute);
  const whatIfFn = useServerFn(applyWhatIf);
  const saveFn = useServerFn(saveShipment);
  const logEventFn = useServerFn(logAnalyticsEvent);

  const [source, setSource] = useState(DEMO_SOURCE);
  const [destination, setDestination] = useState(DEMO_DESTINATION);
  const [weight, setWeight] = useState(DEMO_WEIGHT);
  const [urgency, setUrgency] = useState<Urgency>(DEMO_URGENCY);

  const [original, setOriginal] = useState<RouteResult | null>(null);
  const [preOptimize, setPreOptimize] = useState<RouteResult | null>(null);
  const [current, setCurrent] = useState<RouteResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const autoPlanned = useRef(false);

  // "auto" = let AI decide, or a specific Transport = user override
  const [selectedTransport, setSelectedTransport] = useState<Transport | "auto">("auto");

  // Keep a ref to current for use in closures (fixes stale closure bug)
  const currentRef = useRef(current);
  currentRef.current = current;

  // Derived: what the AI would recommend for current inputs (memoized)
  const aiRecommended = useMemo<Transport>(() => {
    const dist = haversineKm(source, destination);
    return decideTransport(weight, urgency, dist, source, destination);
  }, [source, destination, weight, urgency]);

  const [messages, setMessages] = useState<AssistantMessage[]>(() => [introMessage()]);
  const pushMessages = (next: AssistantMessage[] | AssistantMessage | null) => {
    if (!next) return;
    const arr = Array.isArray(next) ? next : [next];
    if (arr.length === 0) return;
    setMessages((prev) => [...prev, ...arr]);
  };
  const handleUserMessage = (msgs: AssistantMessage[]) => {
    setMessages((prev) => [...prev, ...msgs]);
  };

  const run = (action: string, fn: () => Promise<void>) => {
    setLoadingAction(action);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAction(null);
      }
    });
  };

  const handlePlan = (
    src = source,
    dst = destination,
    wt = weight,
    urg = urgency,
    transport = selectedTransport,
  ) =>
    run("plan", async () => {
      const res = transport === "auto"
        ? await planFn({ data: { source: src, destination: dst, weight: wt, urgency: urg } })
        : await planWithTransportFn({ data: { source: src, destination: dst, weight: wt, urgency: urg, overrideTransport: transport } });
      setOriginal(res);
      setCurrent(res);
      setPreOptimize(null);
      pushMessages(planMessages(res));
      router.invalidate();
      // Auto-save to D1 database
      saveFn({ data: { route: res } }).catch((e: unknown) => console.warn("[DB] Save failed:", e));
    });

  // Auto-plan demo scenario on first mount so judges see results immediately.
  useEffect(() => {
    if (autoPlanned.current) return;
    autoPlanned.current = true;
    handlePlan(DEMO_SOURCE, DEMO_DESTINATION, DEMO_WEIGHT, DEMO_URGENCY, "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bug fix: always apply disruption on the clean original plan.
  const handleSimulate = (disruption: Disruption) =>
    run(disruption, async () => {
      if (!current) return;
      const base = original ?? current;
      const res = await simulateFn({ data: { route: base, disruption } });
      setCurrent(res);
      setPreOptimize(null);
      pushMessages(disruptionMessages(res, disruption));
      // Log disruption event
      logEventFn({ data: { eventType: "disrupt", transport: res.transport, source: res.source, destination: res.destination, disruption } }).catch(() => {});
    });

  const handleOptimize = () =>
    run("optimize", async () => {
      if (!current) return;
      setPreOptimize(current);
      const res = await optimizeFn({ data: { route: current } });
      setCurrent(res);
      pushMessages(optimizeMessages(current, res));
      // Save optimized result and log event
      saveFn({ data: { route: res } }).catch(() => {});
      logEventFn({ data: { eventType: "optimize", transport: res.transport, source: res.source, destination: res.destination, metadata: { switched: current.transport !== res.transport } } }).catch(() => {});
    });

  const resetToOriginal = () => {
    if (original) {
      setCurrent(original);
      setPreOptimize(null);
    }
  };

  // Bug fix: what-if layers on top of current state (preserves disruption).
  // Uses currentRef to avoid stale closure capturing old `current` in setTimeout.
  const whatIfTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleWhatIf = (next: { traffic: Intensity; rain: Intensity }) => {
    if (!current) return;
    setCurrent((c) => (c ? { ...c, trafficLevel: next.traffic, rainLevel: next.rain } : c));
    if (whatIfTimer.current) clearTimeout(whatIfTimer.current);
    whatIfTimer.current = setTimeout(() => {
      const latest = currentRef.current;
      if (!latest) return;
      run("whatif", async () => {
        const res = await whatIfFn({
          data: { route: latest, traffic: next.traffic, rain: next.rain },
        });
        setCurrent(res);
        setPreOptimize(null);
        pushMessages(whatIfMessage(res));
      });
    }, 180);
  };

  useEffect(
    () => () => {
      if (whatIfTimer.current) clearTimeout(whatIfTimer.current);
    },
    [],
  );

  // Auto-plan when transport mode changes (skip on first render)
  const isFirstTransportChange = useRef(true);
  useEffect(() => {
    if (isFirstTransportChange.current) {
      isFirstTransportChange.current = false;
      return;
    }
    if (current) handlePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTransport]);

  // Swap source and destination
  const handleSwapCities = useCallback(() => {
    setSource(destination);
    setDestination(source);
  }, [source, destination]);

  const regionMap = useMemo(() => citiesByRegion(), []);

  return (
    <main className="min-h-screen text-foreground md:pr-[360px]" style={{ background: "var(--gradient-hero)" }}>
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60" style={{ background: "var(--gradient-glow)" }} />

      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--gradient-mint)" }}>
                <Truck className="h-4 w-4 text-[var(--brand-deep)]" strokeWidth={2.5} />
              </div>
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse-ring" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">FlowChain</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Logistics OS</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">Dashboard</span>
            <Link to="/history" className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground" id="nav-history">
              📊 History
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-10 md:px-8 md:pt-14">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            AI Route Intelligence · 40 Global Cities · 6 Regions
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Smart supply chains that{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-mint)" }}>
              think, react, re-route.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Plan freight routes across 40 global cities, simulate real-world disruptions,
            and let our AI optimize transport mode, ETA, and cost — instantly.
          </p>
        </div>
      </section>

      {/* Planner */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left column */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-6 shadow-[var(--shadow-card)]">
              <div className="mb-5 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">Shipment</h2>
              </div>
              <div className="space-y-4">
                <CitySelect label="Source" icon={<MapPin className="h-3.5 w-3.5" />} value={source} onChange={setSource} exclude={destination} regionMap={regionMap} />

                {/* Swap cities */}
                <div className="flex justify-center -my-1">
                  <button
                    type="button"
                    onClick={handleSwapCities}
                    disabled={pending}
                    className="group flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary/40 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:rotate-180 disabled:opacity-40"
                    aria-label="Swap source and destination"
                    id="swap-cities-btn"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <CitySelect label="Destination" icon={<MapPin className="h-3.5 w-3.5 text-primary" />} value={destination} onChange={setDestination} exclude={source} regionMap={regionMap} />

                <div className="space-y-1.5">
                  <Label htmlFor="weight-input" className="text-xs uppercase tracking-wider text-muted-foreground">Weight (kg)</Label>
                  <Input id="weight-input" name="weight" type="number" min={1} max={50000} step={1} value={weight} onChange={(e) => setWeight(Math.round(Number(e.target.value)) || 1)} className="bg-secondary/40 border-border" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="urgency-select" className="text-xs uppercase tracking-wider text-muted-foreground">Urgency</Label>
                  <Select name="urgency" value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
                    <SelectTrigger id="urgency-select" className="bg-secondary/40 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low — cost priority</SelectItem>
                      <SelectItem value="Medium">Medium — balanced</SelectItem>
                      <SelectItem value="High">High — speed priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button id="plan-route-btn" onClick={() => handlePlan()} disabled={pending} className="group relative h-11 w-full overflow-hidden font-semibold text-[var(--brand-deep)] shadow-[var(--shadow-glow)] hover:shadow-[var(--shadow-elevated)]" style={{ background: "var(--gradient-mint)" }}>
                  {loadingAction === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><Zap className="mr-1.5 h-4 w-4 transition-transform group-hover:scale-110" />{selectedTransport === "auto" ? "Plan Route (AI)" : `Plan with ${selectedTransport.split(" ")[0]}`}</>
                  )}
                </Button>

                {current && (
                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Simulate disruption</p>
                    <div className="grid grid-cols-3 gap-2">
                      {current.oceanRoute ? (
                        // Ocean routes: Storm replaces Traffic/Block (irrelevant on water)
                        <>
                          <DisruptionBtn icon={Waves} label="Storm" loading={loadingAction === "storm"} onClick={() => handleSimulate("storm")} />
                          <DisruptionBtn icon={CloudRain} label="Rain" loading={loadingAction === "rain"} onClick={() => handleSimulate("rain")} />
                          <DisruptionBtn icon={Anchor} label="Port Block" loading={loadingAction === "blockage"} onClick={() => handleSimulate("blockage")} />
                        </>
                      ) : (
                        // Land routes: Traffic, Rain, Blockage
                        <>
                          <DisruptionBtn icon={TrafficCone} label="Traffic" loading={loadingAction === "traffic"} onClick={() => handleSimulate("traffic")} />
                          <DisruptionBtn icon={CloudRain} label="Rain" loading={loadingAction === "rain"} onClick={() => handleSimulate("rain")} />
                          <DisruptionBtn icon={Construction} label="Block" loading={loadingAction === "blockage"} onClick={() => handleSimulate("blockage")} />
                        </>
                      )}
                    </div>
                    {(current.disruption || current.trafficLevel > 0 || current.rainLevel > 0) && (
                      <Button onClick={handleOptimize} disabled={pending} variant="outline" className="mt-2 h-10 w-full border-primary/40 bg-primary/10 text-primary hover:bg-primary/20">
                        {loadingAction === "optimize" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1.5 h-4 w-4" />AI Optimize</>}
                      </Button>
                    )}
                    {(current.disruption || current.optimized) && (
                      <button onClick={resetToOriginal} className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                        Reset to original plan
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {current && (
              <WhatIfControls traffic={current.trafficLevel} rain={current.rainLevel} onChange={handleWhatIf} disabled={pending && loadingAction !== "whatif"} />
            )}

            {/* Transport selector — always visible once cities are chosen */}
            <TransportSelector
              source={source}
              destination={destination}
              distance={haversineKm(source, destination)}
              selected={selectedTransport}
              aiRecommended={aiRecommended}
              onSelect={(t) => {
                setSelectedTransport(t);
              }}
              disabled={pending}
            />

            {/* Live weather */}
            <WeatherWidget source={source} destination={destination} />

            {current && <DecisionTimeline steps={current.timeline} />}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="relative grid h-[340px] overflow-hidden rounded-2xl border border-border bg-[var(--brand-deep)] shadow-[var(--shadow-card)] md:h-[420px]">
              {current ? (
                <MapView source={current.source} destination={current.destination} optimized={current.optimized} transport={current.transport} disrupted={!!current.disruption || current.trafficLevel >= 2 || current.rainLevel >= 2} />
              ) : (
                <EmptyMap />
              )}
              {/* Route summary badge */}
              {current && (
                <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-full border border-border/60 bg-[var(--brand-deep)]/90 px-3 py-1.5 text-xs backdrop-blur-sm animate-fade-in">
                  <span className="font-medium">{current.source}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{current.destination}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-primary font-semibold">{current.distance.toLocaleString()} km</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{current.transport.split(" ")[1]}</span>
                </div>
              )}
            </div>

            {pending && loadingAction === "plan" && !current ? (
              /* Skeleton loading state */
              <div className="space-y-4">
                <div className="shimmer h-16 rounded-2xl" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[1,2,3,4].map(i => <div key={i} className="shimmer h-28 rounded-2xl" />)}
                </div>
                <div className="shimmer h-40 rounded-2xl" />
              </div>
            ) : current ? (
              <div className="space-y-4 animate-fade-up">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-[var(--gradient-card)] p-4 shadow-[var(--shadow-card)] animate-scale-in">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: "var(--gradient-mint)" }}>
                      <span>{current.transport.split(" ")[1] ?? "🚚"}</span>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Recommended transport</p>
                      <p className="text-lg font-semibold">{current.transport}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-full border border-border bg-secondary/40 px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">
                      {CITIES[current.source]?.region} → {CITIES[current.destination]?.region}
                    </span>
                    {current.oceanRoute && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-400">
                        <Anchor className="h-3 w-3" /> Ocean route
                      </span>
                    )}
                    <RiskBadge risk={current.risk} />
                  </div>
                </div>

                {current.warning && (
                  <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning animate-slide-in-right">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{current.warning}</p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="stagger-1 animate-fade-up"><StatCard icon={Timer} label="ETA" value={`${current.eta} h`} hint={current.eta !== current.baseEta ? `${current.eta > current.baseEta ? "+" : ""}${(current.eta - current.baseEta).toFixed(1)}h vs plan` : "On schedule"} tone={current.eta > current.baseEta ? "warning" : "success"} /></div>
                  <div className="stagger-2 animate-fade-up"><StatCard icon={RouteIcon} label="Distance" value={`${current.distance.toLocaleString()} km`} hint={`${current.source} → ${current.destination}`} /></div>
                  <div className="stagger-3 animate-fade-up"><StatCard icon={DollarSign} label="Cost" value={`₹${current.cost.toLocaleString()}`} hint={`@ ₹${(current.cost / current.distance).toFixed(1)}/km`} /></div>
                  <div className="stagger-4 animate-fade-up"><StatCard icon={Leaf} label="CO₂" value={`${current.co2.toLocaleString()} kg`} hint="Estimated emissions" tone={current.co2 < 500 ? "success" : "default"} /></div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <AIExplanationPanel route={current} />
                  <ConfidenceGauge value={current.confidence} />
                </div>

                {preOptimize && current.optimized && (
                  <ImpactPanel before={preOptimize} after={current} />
                )}

                {original && current.optimized && original.transport !== current.transport && (
                  <ComparisonPanel before={original} after={current} />
                )}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 md:flex-row md:justify-between md:px-8">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              FlowChain v1.0
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">AI-powered logistics decisions</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <span>React 19</span>
            <span>·</span>
            <span>Gemini AI</span>
            <span>·</span>
            <span>Google Maps</span>
            <span>·</span>
            <span>40 cities · 6 regions</span>
          </div>
        </div>
      </footer>

      <AssistantPanel messages={messages} onUserMessage={handleUserMessage} route={current} />
    </main>
  );
}

function CitySelect({
  label,
  icon,
  value,
  onChange,
  exclude,
  regionMap,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
  regionMap: Record<string, string[]>;
}) {
  const selectId = `city-select-${label.toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={selectId} className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </Label>
      <Select name={selectId} value={value} onValueChange={onChange}>
        <SelectTrigger id={selectId} className="bg-secondary/40 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {CITY_REGIONS.map((region) => {
            const cities = (regionMap[region] ?? []).filter((c) => c !== exclude);
            if (cities.length === 0) return null;
            return (
              <SelectGroup key={region}>
                <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {region}
                </SelectLabel>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CITIES[c]?.label ?? c}
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      {CITIES[c]?.country}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

function DisruptionBtn({
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-secondary/40 px-2 py-3 text-xs font-medium text-foreground/80 transition-[var(--transition-smooth)] hover:-translate-y-0.5 hover:border-warning/50 hover:bg-warning/10 hover:text-warning disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
      )}
      {label}
    </button>
  );
}

function EmptyMap() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="rounded-2xl border border-border bg-secondary/40 p-4 animate-float-slow">
        <Activity className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm">
        Configure a shipment and click <span className="font-medium text-foreground">Plan Route</span>
      </p>
    </div>
  );
}

function EmptyState() {
  const features = [
    { icon: Zap, title: "Instant AI planning", body: "Picks optimal transport from urgency, weight, and distance." },
    { icon: AlertTriangle, title: "Disruption simulation", body: "Inject traffic, weather, or blockages live." },
    { icon: Sparkles, title: "Auto re-routing", body: "Evaluates all modes and explains what was rejected." },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {features.map((f) => (
        <div key={f.title} className="rounded-2xl border border-border bg-[var(--gradient-card)] p-4">
          <f.icon className="mb-2 h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{f.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
        </div>
      ))}
    </div>
  );
}
