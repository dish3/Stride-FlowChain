import {
  CITIES,
  COST_PER_KM,
  CO2_PER_KM,
  buildReasoning,
  buildTimeline,
  calculateETA,
  canShip,
  computeConfidence,
  decideTransport,
  disruptionDelay,
  dynamicDelay,
  explain,
  getRisk,
  haversineKm,
  isOceanRoute,
  type Disruption,
  type Intensity,
  type RouteResult,
  type Transport,
  type Urgency,
} from "@/lib/supply-chain";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function callApi(endpoint: string, data: any) {
  const res = await fetch(`${API_URL}/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Failed to fetch ${endpoint}`);
  }
  return res.json();
}

export const callApiGet = async (endpoint: string, params: Record<string, any> = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/${endpoint}${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Failed to fetch ${endpoint}`);
  }
  return res.json();
}

// Emulate useServerFn hook from react-start
export function useServerFn(fn: any) {
  return fn;
}

type RouteInput = {
  source: string;
  destination: string;
  weight: number;
  urgency: Urgency;
};

const normalizeRouteInput = (input: RouteInput): RouteInput => {
  if (!CITIES[input.source] || !CITIES[input.destination]) {
    throw new Error("Unknown city");
  }
  if (input.source === input.destination) {
    throw new Error("Source and destination must differ");
  }
  return {
    ...input,
    weight: Math.max(1, Math.min(50000, Math.round(Number(input.weight) || 1))),
    urgency: input.urgency === "High" || input.urgency === "Medium" ? input.urgency : "Low",
  };
};

const buildLocalResult = (input: RouteInput, overrideTransport?: Transport): RouteResult => {
  const data = normalizeRouteInput(input);
  const distance = haversineKm(data.source, data.destination);
  const ocean = isOceanRoute(data.source, data.destination);
  const transport = overrideTransport ?? decideTransport(data.weight, data.urgency, distance, data.source, data.destination);
  const eta = calculateETA(distance, transport);
  const risk = getRisk(data.urgency, null, 0, 0);

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
    trafficLevel: 0,
    rainLevel: 0,
    warning: null,
    optimized: false,
    suggestion: overrideTransport
      ? `Manually selected ${overrideTransport} - AI recommended ${decideTransport(data.weight, data.urgency, distance, data.source, data.destination)}.`
      : null,
    oceanRoute: ocean,
    timeline: buildTimeline({ hasPlan: true, disruption: null, optimized: false }),
  };
};

const localSimulateDisruption = ({ route, disruption }: { route: RouteResult; disruption: Disruption }): RouteResult => {
  const delay = disruptionDelay(disruption, route.transport);
  const trafficLevel: Intensity = disruption === "traffic" ? 3 : route.trafficLevel;
  const rainLevel: Intensity = disruption === "rain" || disruption === "storm" ? 3 : route.rainLevel;
  const risk = getRisk(route.urgency, disruption, trafficLevel, rainLevel);
  const warningMap: Record<Disruption, string> = {
    traffic: "Heavy traffic congestion detected on the corridor.",
    rain: "Severe rainfall reducing transport speed.",
    blockage: "Route blockage reported - major slowdown.",
    storm: "Severe storm warning on the ocean corridor - significant delay expected.",
  };

  return {
    ...route,
    eta: +(route.baseEta + delay).toFixed(1),
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
};

const localApplyWhatIf = ({ route, traffic, rain }: { route: RouteResult; traffic: number; rain: number }): RouteResult => {
  const clamp = (n: number): Intensity => Math.max(0, Math.min(3, Math.round(n))) as Intensity;
  const trafficLevel = clamp(traffic);
  const rainLevel = clamp(rain);
  const delay = dynamicDelay(trafficLevel, rainLevel, route.transport);
  const disruption =
    route.disruption ?? (trafficLevel >= 2 ? "traffic" : rainLevel >= 2 ? (route.oceanRoute ? "storm" : "rain") : null);
  const risk = getRisk(route.urgency, disruption, trafficLevel, rainLevel);

  return {
    ...route,
    eta: +(route.baseEta + delay).toFixed(1),
    trafficLevel,
    rainLevel,
    disruption,
    risk,
    warning: trafficLevel >= 2 || rainLevel >= 2 ? `Conditions changed - ETA shifted by +${delay.toFixed(1)}h.` : null,
    optimized: false,
    suggestion: null,
    confidence: computeConfidence(route.urgency, risk, disruption, false),
    timeline: buildTimeline({ hasPlan: true, disruption, optimized: false }),
  };
};

const localOptimizeRoute = ({ route }: { route: RouteResult }): RouteResult => {
  const candidates = route.oceanRoute
    ? (canShip(route.source, route.destination) ? (["Air ✈️", "Ship 🚢"] as Transport[]) : (["Air ✈️"] as Transport[]))
    : (["Air ✈️", "Train 🚆", "Truck 🚛"] as Transport[]);

  const scored = candidates.map((transport) => {
    const baseEta = calculateETA(route.distance, transport);
    const eta = +(baseEta + dynamicDelay(route.trafficLevel, route.rainLevel, transport)).toFixed(1);
    const cost = Math.round(route.distance * COST_PER_KM[transport]);
    const score = eta * 10 + cost * 0.05;
    return { transport, baseEta, eta, cost, score };
  }).sort((a, b) => a.score - b.score);

  const winner = scored[0];
  const risk = getRisk(route.urgency, route.disruption, route.trafficLevel, route.rainLevel);
  return {
    ...route,
    transport: winner.transport,
    eta: winner.eta,
    baseEta: winner.baseEta,
    cost: winner.cost,
    co2: +(route.distance * CO2_PER_KM[winner.transport]).toFixed(1),
    risk,
    optimized: true,
    suggestion: winner.transport !== route.transport
      ? `AI re-routed via ${winner.transport} - saved ${(route.eta - winner.eta).toFixed(1)}h vs disrupted plan.`
      : `${winner.transport} remains optimal under current conditions.`,
    reasoning: buildReasoning(winner.transport, route.urgency, route.weight, route.distance, route.source, route.destination),
    confidence: computeConfidence(route.urgency, risk, route.disruption, true),
    timeline: buildTimeline({ hasPlan: true, disruption: route.disruption, optimized: true }),
  };
};

const withLocalFallback = async <T>(request: () => Promise<T>, fallback: () => T): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    console.warn("[API] Server unavailable, using local planner fallback:", error);
    return fallback();
  }
};

// Wrapper functions matching the original server functions signatures
export const planRoute = async (payload: any) => {
  const data = payload.data || payload;
  return withLocalFallback(() => callApi("planRoute", data), () => buildLocalResult(data));
};
export const planRouteWithTransport = async (payload: any) => {
  const data = payload.data || payload;
  return withLocalFallback(() => callApi("planRouteWithTransport", data), () => buildLocalResult(data, data.overrideTransport));
};
export const simulateDisruption = async (payload: any) => {
  const data = payload.data || payload;
  return withLocalFallback(() => callApi("simulateDisruption", data), () => localSimulateDisruption(data));
};
export const applyWhatIf = async (payload: any) => {
  const data = payload.data || payload;
  return withLocalFallback(() => callApi("applyWhatIf", data), () => localApplyWhatIf(data));
};
export const optimizeRoute = async (payload: any) => {
  const data = payload.data || payload;
  return withLocalFallback(() => callApi("optimizeRoute", data), () => localOptimizeRoute(data));
};
export const geminiChat = async (payload: any) => callApi("geminiChat", payload.data || payload);
export const saveShipment = async (payload: any) => callApi("saveShipment", payload.data || payload);
export const logAnalyticsEvent = async (payload: any) => callApi("logAnalyticsEvent", payload.data || payload);
export const getShipments = async (payload: any) => callApiGet("getShipments", payload.data || payload);
export const getShipmentById = async (payload: any) => callApiGet("getShipmentById", payload.data || payload);
export const deleteShipment = async (payload: any) => callApi("deleteShipment", payload.data || payload);
export const getDashboardStats = async () => callApiGet("getDashboardStats");
