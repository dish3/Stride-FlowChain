import { createServerFn } from "@tanstack/react-start";
import {
  CITIES,
  COST_PER_KM,
  CO2_PER_KM,
  buildReasoning,
  buildTimeline,
  calculateETA,
  computeConfidence,
  decideTransport,
  disruptionDelay,
  dynamicDelay,
  explain,
  getRisk,
  haversineKm,
  isOceanRoute,
  canShip,
  type Disruption,
  type Intensity,
  type RouteResult,
  type Transport,
  type Urgency,
} from "@/lib/supply-chain";

interface RouteInput {
  source: string;
  destination: string;
  weight: number;
  urgency: Urgency;
}

function buildResult(input: RouteInput): RouteResult {
  const distance = haversineKm(input.source, input.destination);
  const ocean = isOceanRoute(input.source, input.destination);
  const transport = decideTransport(input.weight, input.urgency, distance, input.source, input.destination);
  const eta = calculateETA(distance, transport);
  const risk = getRisk(input.urgency, null);
  return {
    source: input.source,
    destination: input.destination,
    weight: input.weight,
    urgency: input.urgency,
    transport,
    eta,
    baseEta: eta,
    distance,
    risk,
    cost: Math.round(distance * COST_PER_KM[transport]),
    co2: +(distance * CO2_PER_KM[transport]).toFixed(1),
    explanation: explain(transport, input.urgency, input.weight, ocean),
    reasoning: buildReasoning(transport, input.urgency, input.weight, distance, input.source, input.destination),
    confidence: computeConfidence(input.urgency, risk, null, false),
    disruption: null,
    trafficLevel: 0,
    rainLevel: 0,
    warning: null,
    optimized: false,
    suggestion: null,
    oceanRoute: ocean,
    timeline: buildTimeline({ hasPlan: true, disruption: null, optimized: false }),
  };
}

export const planRoute = createServerFn({ method: "POST" })
  .inputValidator((input: RouteInput) => {
    if (!CITIES[input.source] || !CITIES[input.destination]) {
      throw new Error("Unknown city");
    }
    if (input.source === input.destination) {
      throw new Error("Source and destination must differ");
    }
    const weight = Math.max(1, Math.min(50000, Math.round(Number(input.weight) || 1)));
    const urgency: Urgency =
      input.urgency === "High" || input.urgency === "Medium" ? input.urgency : "Low";
    return { ...input, weight, urgency };
  })
  .handler(async ({ data }) => buildResult(data));

// Plan with a manually overridden transport mode
export const planRouteWithTransport = createServerFn({ method: "POST" })
  .inputValidator((input: RouteInput & { overrideTransport: Transport }) => {
    if (!CITIES[input.source] || !CITIES[input.destination]) throw new Error("Unknown city");
    if (input.source === input.destination) throw new Error("Source and destination must differ");
    const weight = Math.max(1, Math.min(50000, Math.round(Number(input.weight) || 1)));
    const urgency: Urgency = input.urgency === "High" || input.urgency === "Medium" ? input.urgency : "Low";
    return { ...input, weight, urgency };
  })
  .handler(async ({ data }) => {
    const distance = haversineKm(data.source, data.destination);
    const ocean = isOceanRoute(data.source, data.destination);
    const transport = data.overrideTransport;
    const eta = calculateETA(distance, transport);
    const risk = getRisk(data.urgency, null);
    return {
      source: data.source,
      destination: data.destination,
      weight: data.weight,
      urgency: data.urgency,
      transport,
      eta,
      baseEta: eta,
      distance,
      risk,
      cost: Math.round(distance * COST_PER_KM[transport]),
      co2: +(distance * CO2_PER_KM[transport]).toFixed(1),
      explanation: explain(transport, data.urgency, data.weight, ocean),
      reasoning: buildReasoning(transport, data.urgency, data.weight, distance, data.source, data.destination),
      confidence: computeConfidence(data.urgency, risk, null, false),
      disruption: null,
      trafficLevel: 0 as Intensity,
      rainLevel: 0 as Intensity,
      warning: null,
      optimized: false,
      suggestion: `Manually selected ${transport} — AI recommended ${decideTransport(data.weight, data.urgency, distance, data.source, data.destination)}.`,
      oceanRoute: ocean,
      timeline: buildTimeline({ hasPlan: true, disruption: null, optimized: false }),
    } satisfies RouteResult;
  });

export const simulateDisruption = createServerFn({ method: "POST" })
  .inputValidator((input: { route: RouteResult; disruption: Disruption }) => {
    if (!["traffic", "rain", "blockage", "storm"].includes(input.disruption)) {
      throw new Error("Invalid disruption");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const { route, disruption } = data;
    const delay = disruptionDelay(disruption, route.transport);
    const newEta = +(route.baseEta + delay).toFixed(1);
    const trafficLevel: Intensity = disruption === "traffic" ? 3 : route.trafficLevel;
    const rainLevel: Intensity = (disruption === "rain" || disruption === "storm") ? 3 : route.rainLevel;
    const risk = getRisk(route.urgency, disruption, trafficLevel, rainLevel);

    const warningMap: Record<Disruption, string> = {
      traffic: "Heavy traffic congestion detected on the corridor.",
      rain:    "Severe rainfall reducing transport speed.",
      blockage:"Route blockage reported — major slowdown.",
      storm:   "Severe storm warning on the ocean corridor — significant delay expected. 🌊",
    };

    const result: RouteResult = {
      ...route,
      eta: newEta,
      risk,
      disruption,
      trafficLevel,
      rainLevel,
      warning: warningMap[disruption],
      optimized: false,
      suggestion: null,
      confidence: computeConfidence(route.urgency, risk, disruption, false),
      timeline: buildTimeline({ hasPlan: true, disruption, optimized: false }),
    };
    return result;
  });

export const applyWhatIf = createServerFn({ method: "POST" })
  .inputValidator((input: { route: RouteResult; traffic: Intensity; rain: Intensity }) => {
    const clamp = (n: number): Intensity => (Math.max(0, Math.min(3, Math.round(n))) as Intensity);
    return { route: input.route, traffic: clamp(input.traffic), rain: clamp(input.rain) };
  })
  .handler(async ({ data }) => {
    const { route, traffic, rain } = data;
    const delay = dynamicDelay(traffic, rain, route.transport);
    const newEta = +(route.baseEta + delay).toFixed(1);
    const disruption: Disruption | null =
      route.disruption ??
      (traffic >= 2 ? "traffic" : rain >= 2 ? (route.oceanRoute ? "storm" : "rain") : null);
    const risk = getRisk(route.urgency, disruption, traffic, rain);
    const warning =
      traffic >= 2 || rain >= 2
        ? `${traffic >= 2 ? `Traffic L${traffic}` : ""}${traffic >= 2 && rain >= 2 ? " · " : ""}${rain >= 2 ? `Rain L${rain}` : ""} — ETA shifted by +${delay.toFixed(1)}h.`
        : null;
    const result: RouteResult = {
      ...route,
      eta: newEta,
      trafficLevel: traffic,
      rainLevel: rain,
      disruption,
      risk,
      warning,
      optimized: false,
      suggestion: null,
      confidence: computeConfidence(route.urgency, risk, disruption, false),
      timeline: buildTimeline({ hasPlan: true, disruption, optimized: false }),
    };
    return result;
  });

// ─── Disruption penalty per transport mode ────────────────────────────────────

function disruptionPenalty(disruption: Disruption | null, transport: Transport): number {
  if (!disruption) return 0;
  if (disruption === "storm") {
    if (transport === "Ship 🚢") return 80;  // storms devastate sea routes
    if (transport === "Air ✈️") return 20;
    return 5;
  }
  if (disruption === "blockage") {
    if (transport === "Truck 🚛") return 60;
    if (transport === "Train 🚆") return 20;
    return 0;
  }
  if (disruption === "rain") {
    if (transport === "Air ✈️")  return 15;
    if (transport === "Ship 🚢") return 25;
    if (transport === "Truck 🚛") return 10;
    return 5;
  }
  if (disruption === "traffic") {
    if (transport === "Truck 🚛") return 25;
    if (transport === "Train 🚆") return 5;
    return 0;
  }
  return 0;
}

// ─── Optimize route ───────────────────────────────────────────────────────────

export const optimizeRoute = createServerFn({ method: "POST" })
  .inputValidator((input: { route: RouteResult }) => input)
  .handler(async ({ data }) => {
    const { route } = data;
    const ocean = route.oceanRoute;
    const shipViable = canShip(route.source, route.destination);

    // Only offer physically viable modes for this route.
    const candidates: Transport[] = ocean
      ? (shipViable ? ["Air ✈️", "Ship 🚢"] : ["Air ✈️"])
      : ["Air ✈️", "Train 🚆", "Truck 🚛"];

    const scored: Array<{
      transport: Transport;
      eta: number;
      baseEta: number;
      cost: number;
      score: number;
      rejectionReason: string | null;
    }> = [];

    for (const t of candidates) {
      const baseEta = calculateETA(route.distance, t);
      const delay = dynamicDelay(route.trafficLevel, route.rainLevel, t);
      const eta = +(baseEta + delay).toFixed(1);
      const cost = Math.round(route.distance * COST_PER_KM[t]);
      const penalty = disruptionPenalty(route.disruption, t);
      const score = eta * 10 + cost * 0.05 + penalty;

      let rejectionReason: string | null = null;
      if (route.disruption === "storm" && t === "Ship 🚢") {
        rejectionReason = "Active storm makes sea freight dangerous and unreliable";
      } else if (route.disruption === "blockage" && t === "Truck 🚛") {
        rejectionReason = "Road blockage makes truck unreliable";
      } else if (route.disruption === "rain" && t === "Air ✈️") {
        rejectionReason = "Heavy rain causes flight delays";
      } else if (route.disruption === "traffic" && t === "Truck 🚛") {
        rejectionReason = "Heavy traffic severely impacts road freight";
      } else if (t === "Air ✈️" && route.urgency !== "High") {
        rejectionReason = `Premium cost (₹${cost.toLocaleString()}) not justified for ${route.urgency.toLowerCase()} urgency`;
      } else if (t === "Train 🚆" && route.weight < 500) {
        rejectionReason = `Light load (${route.weight}kg) doesn't benefit from rail efficiency`;
      } else if (t === "Ship 🚢" && route.urgency === "High") {
        rejectionReason = `Too slow (${eta}h) for high-urgency cargo`;
      }

      scored.push({ transport: t, eta, baseEta, cost, score, rejectionReason });
    }

    scored.sort((a, b) => a.score - b.score);
    const winner = scored[0];
    const rejected = scored.slice(1);

    const risk = getRisk(route.urgency, null, route.trafficLevel, route.rainLevel);
    const switched = winner.transport !== route.transport;

    const rejectedLines = rejected.map((r) => {
      const reason = r.rejectionReason ?? `Higher combined score (ETA ${r.eta}h, ₹${r.cost.toLocaleString()})`;
      return `${r.transport} considered — rejected: ${reason}.`;
    });

    // Also note physically excluded modes.
    if (ocean) {
      rejectedLines.push(`Train 🚆 excluded — physically impossible on ocean route.`);
      rejectedLines.push(`Truck 🚛 excluded — physically impossible on ocean route.`);
    }

    const optimizedResult: RouteResult = {
      ...route,
      transport: winner.transport,
      eta: winner.eta,
      baseEta: winner.baseEta,
      cost: winner.cost,
      co2: +(route.distance * CO2_PER_KM[winner.transport]).toFixed(1),
      risk,
      warning: null,
      disruption: route.disruption,
      optimized: true,
      oceanRoute: ocean,
      suggestion: switched
        ? `AI re-routed via ${winner.transport} — saved ${(route.eta - winner.eta).toFixed(1)}h vs disrupted plan.`
        : `${winner.transport} remains optimal — plan tightened against current conditions.`,
      reasoning: [
        ...buildReasoning(winner.transport, route.urgency, route.weight, route.distance, route.source, route.destination),
        switched
          ? `Switched from ${route.transport} → ${winner.transport} due to ${route.disruption ?? "current conditions"}.`
          : `${winner.transport} re-confirmed as best option under current conditions.`,
        ...rejectedLines,
      ],
      confidence: computeConfidence(route.urgency, risk, null, true),
      timeline: buildTimeline({ hasPlan: true, disruption: route.disruption, optimized: true }),
    };

    return optimizedResult;
  });
