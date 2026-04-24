// Shared types + constants for the Smart Supply Chain demo.

export type Transport = "Air ✈️" | "Ship 🚢" | "Train 🚆" | "Truck 🚛";
export type Urgency = "Low" | "Medium" | "High";
export type Risk = "Low" | "Medium" | "High";
export type Disruption = "traffic" | "rain" | "blockage" | "storm";
export type Intensity = 0 | 1 | 2 | 3; // none, low, medium, high

export interface DecisionStep {
  id: string;
  label: string;
  detail: string;
  status: "done" | "active" | "pending";
  icon: "shipment" | "ai" | "disruption" | "predict" | "optimize";
}

export interface RouteResult {
  source: string;
  destination: string;
  weight: number;
  urgency: Urgency;
  transport: Transport;
  eta: number;
  baseEta: number;
  distance: number;
  risk: Risk;
  cost: number;
  co2: number;
  explanation: string;
  reasoning: string[];
  confidence: number; // 0–100
  disruption: Disruption | null;
  trafficLevel: Intensity;
  rainLevel: Intensity;
  warning: string | null;
  optimized: boolean;
  suggestion: string | null;
  timeline: DecisionStep[];
  oceanRoute: boolean; // true when route crosses open ocean
}

// ─── Speed (km/h) ─────────────────────────────────────────────────────────────
export const SPEED: Record<Transport, number> = {
  "Air ✈️":   800,
  "Ship 🚢":   35,   // ~19 knots average container ship
  "Train 🚆": 120,
  "Truck 🚛":  80,
};

// ─── Cost (₹ per km) ──────────────────────────────────────────────────────────
export const COST_PER_KM: Record<Transport, number> = {
  "Air ✈️":   12,
  "Ship 🚢":   1.2,  // cheapest per km for bulk
  "Train 🚆":  4,
  "Truck 🚛":  6,
};

// ─── CO₂ (kg per km) ──────────────────────────────────────────────────────────
export const CO2_PER_KM: Record<Transport, number> = {
  "Air ✈️":   0.85,
  "Ship 🚢":   0.015, // very low per km, but long distances add up
  "Train 🚆":  0.05,
  "Truck 🚛":  0.18,
};

export type CityRegion = "India" | "Asia" | "Europe" | "Americas" | "Middle East" | "Africa";

export interface CityMeta {
  lat: number;
  lng: number;
  label: string;
  region: CityRegion;
  country: string;
  /** true = this city has a major seaport */
  hasPort?: boolean;
  /** true = landlocked, cannot be a direct ship origin/destination */
  landlocked?: boolean;
}

// ─── Global city network — 40 cities across 6 regions ────────────────────────
export const CITIES: Record<string, CityMeta> = {
  // ── India ──────────────────────────────────────────────────────────────────
  Mumbai:       { lat: 19.076,   lng: 72.8777,  label: "Mumbai",       region: "India",       country: "India",        hasPort: true },
  Delhi:        { lat: 28.7041,  lng: 77.1025,  label: "Delhi",        region: "India",       country: "India",        landlocked: true },
  Bangalore:    { lat: 12.9716,  lng: 77.5946,  label: "Bangalore",    region: "India",       country: "India",        landlocked: true },
  Chennai:      { lat: 13.0827,  lng: 80.2707,  label: "Chennai",      region: "India",       country: "India",        hasPort: true },
  Kolkata:      { lat: 22.5726,  lng: 88.3639,  label: "Kolkata",      region: "India",       country: "India",        hasPort: true },
  Hyderabad:    { lat: 17.385,   lng: 78.4867,  label: "Hyderabad",    region: "India",       country: "India",        landlocked: true },
  Pune:         { lat: 18.5204,  lng: 73.8567,  label: "Pune",         region: "India",       country: "India",        landlocked: true },
  Ahmedabad:    { lat: 23.0225,  lng: 72.5714,  label: "Ahmedabad",    region: "India",       country: "India",        landlocked: true },
  Jaipur:       { lat: 26.9124,  lng: 75.7873,  label: "Jaipur",       region: "India",       country: "India",        landlocked: true },
  Surat:        { lat: 21.1702,  lng: 72.8311,  label: "Surat",        region: "India",       country: "India",        hasPort: true },
  // ── Asia ───────────────────────────────────────────────────────────────────
  Shanghai:     { lat: 31.2304,  lng: 121.4737, label: "Shanghai",     region: "Asia",        country: "China",        hasPort: true },
  Beijing:      { lat: 39.9042,  lng: 116.4074, label: "Beijing",      region: "Asia",        country: "China",        landlocked: true },
  Tokyo:        { lat: 35.6762,  lng: 139.6503, label: "Tokyo",        region: "Asia",        country: "Japan",        hasPort: true },
  Singapore:    { lat: 1.3521,   lng: 103.8198, label: "Singapore",    region: "Asia",        country: "Singapore",    hasPort: true },
  Bangkok:      { lat: 13.7563,  lng: 100.5018, label: "Bangkok",      region: "Asia",        country: "Thailand",     hasPort: true },
  Seoul:        { lat: 37.5665,  lng: 126.978,  label: "Seoul",        region: "Asia",        country: "South Korea",  hasPort: true },
  KualaLumpur:  { lat: 3.1390,   lng: 101.6869, label: "Kuala Lumpur", region: "Asia",        country: "Malaysia",     landlocked: true },
  Jakarta:      { lat: -6.2088,  lng: 106.8456, label: "Jakarta",      region: "Asia",        country: "Indonesia",    hasPort: true },
  HongKong:     { lat: 22.3193,  lng: 114.1694, label: "Hong Kong",    region: "Asia",        country: "China",        hasPort: true },
  // ── Europe ─────────────────────────────────────────────────────────────────
  London:       { lat: 51.5074,  lng: -0.1278,  label: "London",       region: "Europe",      country: "UK",           hasPort: true },
  Paris:        { lat: 48.8566,  lng: 2.3522,   label: "Paris",        region: "Europe",      country: "France",       landlocked: true },
  Frankfurt:    { lat: 50.1109,  lng: 8.6821,   label: "Frankfurt",    region: "Europe",      country: "Germany",      landlocked: true },
  Amsterdam:    { lat: 52.3676,  lng: 4.9041,   label: "Amsterdam",    region: "Europe",      country: "Netherlands",  hasPort: true },
  Rotterdam:    { lat: 51.9244,  lng: 4.4777,   label: "Rotterdam",    region: "Europe",      country: "Netherlands",  hasPort: true },
  Madrid:       { lat: 40.4168,  lng: -3.7038,  label: "Madrid",       region: "Europe",      country: "Spain",        landlocked: true },
  Milan:        { lat: 45.4654,  lng: 9.1859,   label: "Milan",        region: "Europe",      country: "Italy",        landlocked: true },
  Warsaw:       { lat: 52.2297,  lng: 21.0122,  label: "Warsaw",       region: "Europe",      country: "Poland",       landlocked: true },
  // ── Americas ───────────────────────────────────────────────────────────────
  NewYork:      { lat: 40.7128,  lng: -74.006,  label: "New York",     region: "Americas",    country: "USA",          hasPort: true },
  LosAngeles:   { lat: 34.0522,  lng: -118.2437,label: "Los Angeles",  region: "Americas",    country: "USA",          hasPort: true },
  Chicago:      { lat: 41.8781,  lng: -87.6298, label: "Chicago",      region: "Americas",    country: "USA",          landlocked: true },
  SaoPaulo:     { lat: -23.5505, lng: -46.6333, label: "São Paulo",    region: "Americas",    country: "Brazil",       landlocked: true },
  MexicoCity:   { lat: 19.4326,  lng: -99.1332, label: "Mexico City",  region: "Americas",    country: "Mexico",       landlocked: true },
  Toronto:      { lat: 43.6532,  lng: -79.3832, label: "Toronto",      region: "Americas",    country: "Canada",       landlocked: true },
  // ── Middle East ────────────────────────────────────────────────────────────
  Dubai:        { lat: 25.2048,  lng: 55.2708,  label: "Dubai",        region: "Middle East", country: "UAE",          hasPort: true },
  Riyadh:       { lat: 24.7136,  lng: 46.6753,  label: "Riyadh",       region: "Middle East", country: "Saudi Arabia", landlocked: true },
  Istanbul:     { lat: 41.0082,  lng: 28.9784,  label: "Istanbul",     region: "Middle East", country: "Turkey",       hasPort: true },
  // ── Africa ─────────────────────────────────────────────────────────────────
  Lagos:        { lat: 6.5244,   lng: 3.3792,   label: "Lagos",        region: "Africa",      country: "Nigeria",      hasPort: true },
  Nairobi:      { lat: -1.2921,  lng: 36.8219,  label: "Nairobi",      region: "Africa",      country: "Kenya",        landlocked: true },
  Cairo:        { lat: 30.0444,  lng: 31.2357,  label: "Cairo",        region: "Africa",      country: "Egypt",        hasPort: true },
  Johannesburg: { lat: -26.2041, lng: 28.0473,  label: "Johannesburg", region: "Africa",      country: "South Africa", landlocked: true },
};

export const CITY_NAMES = Object.keys(CITIES);
export const CITY_REGIONS: CityRegion[] = ["India", "Asia", "Europe", "Americas", "Middle East", "Africa"];

export function citiesByRegion(): Record<CityRegion, string[]> {
  const out = {} as Record<CityRegion, string[]>;
  for (const region of CITY_REGIONS) out[region] = [];
  for (const [name, meta] of Object.entries(CITIES)) {
    out[meta.region].push(name);
  }
  return out;
}

// ─── Geography helpers ────────────────────────────────────────────────────────

export function haversineKm(a: string, b: string): number {
  const A = CITIES[a];
  const B = CITIES[b];
  if (!A || !B) return 1400;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(B.lat - A.lat);
  const dLng = toRad(B.lng - A.lng);
  const lat1 = toRad(A.lat);
  const lat2 = toRad(B.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function isCrossRegion(a: string, b: string): boolean {
  return CITIES[a]?.region !== CITIES[b]?.region;
}

/**
 * Determines whether a route requires crossing open ocean —
 * making Train and Truck physically impossible.
 *
 * Uses explicit city-pair overrides first (most accurate), then region-pair rules.
 * Key fix: India ↔ Middle East crosses the Arabian Sea — NOT a land route.
 */
export function isOceanRoute(a: string, b: string): boolean {
  const rA = CITIES[a]?.region;
  const rB = CITIES[b]?.region;
  if (!rA || !rB || rA === rB) return false;

  // ── Explicit city-pair ocean overrides ────────────────────────────────────
  // These handle cases where region-level rules are too coarse.
  // India/Asia cities → Gulf cities cross the Arabian Sea.
  const OCEAN_PAIRS = new Set([
    "Mumbai|Dubai",    "Dubai|Mumbai",
    "Mumbai|Riyadh",   "Riyadh|Mumbai",
    "Mumbai|Istanbul", "Istanbul|Mumbai",
    "Chennai|Dubai",   "Dubai|Chennai",
    "Chennai|Riyadh",  "Riyadh|Chennai",
    "Kolkata|Dubai",   "Dubai|Kolkata",
    "Kolkata|Riyadh",  "Riyadh|Kolkata",
    "Bangalore|Dubai", "Dubai|Bangalore",
    "Hyderabad|Dubai", "Dubai|Hyderabad",
    "Pune|Dubai",      "Dubai|Pune",
    "Ahmedabad|Dubai", "Dubai|Ahmedabad",
    "Surat|Dubai",     "Dubai|Surat",
    "Jaipur|Dubai",    "Dubai|Jaipur",
    "Delhi|Dubai",     "Dubai|Delhi",
    // India → Africa (Indian Ocean)
    "Mumbai|Lagos",         "Lagos|Mumbai",
    "Mumbai|Nairobi",       "Nairobi|Mumbai",
    "Mumbai|Cairo",         "Cairo|Mumbai",
    "Mumbai|Johannesburg",  "Johannesburg|Mumbai",
    "Chennai|Lagos",        "Lagos|Chennai",
    "Chennai|Nairobi",      "Nairobi|Chennai",
    // East/SE Asia → Middle East (Arabian Sea / Indian Ocean)
    "Singapore|Dubai",  "Dubai|Singapore",
    "Shanghai|Dubai",   "Dubai|Shanghai",
    "Tokyo|Dubai",      "Dubai|Tokyo",
    "HongKong|Dubai",   "Dubai|HongKong",
    "Jakarta|Dubai",    "Dubai|Jakarta",
    "Bangkok|Dubai",    "Dubai|Bangkok",
    "Seoul|Dubai",      "Dubai|Seoul",
  ]);

  if (OCEAN_PAIRS.has(`${a}|${b}`)) return true;

  // ── Region-pair rules ─────────────────────────────────────────────────────
  // Americas is always separated by ocean from everything else.
  if (rA === "Americas" || rB === "Americas") return true;

  // India ↔ Middle East: Arabian Sea — ocean (no practical freight land bridge).
  if ((rA === "India" && rB === "Middle East") || (rA === "Middle East" && rB === "India")) return true;

  // India ↔ Europe: Indian Ocean + Suez or Cape of Good Hope — ocean.
  if ((rA === "India" && rB === "Europe") || (rA === "Europe" && rB === "India")) return true;

  // Africa ↔ Asia (East/SE): Indian Ocean crossing.
  if ((rA === "Africa" && rB === "Asia") || (rA === "Asia" && rB === "Africa")) return true;

  // India ↔ Africa: Indian Ocean.
  if ((rA === "India" && rB === "Africa") || (rA === "Africa" && rB === "India")) return true;

  // Asia (East/SE) ↔ Europe: technically Eurasia but practical freight goes by sea.
  if ((rA === "Asia" && rB === "Europe") || (rA === "Europe" && rB === "Asia")) return true;

  // Asia (East/SE) ↔ Africa: Indian Ocean.
  if ((rA === "Asia" && rB === "Africa") || (rA === "Africa" && rB === "Asia")) return true;

  // Africa ↔ Europe: Atlantic/Mediterranean coast — practical sea freight route.
  if ((rA === "Africa" && rB === "Europe") || (rA === "Europe" && rB === "Africa")) return true;

  // India ↔ Asia: Bay of Bengal / Andaman Sea separates India from SE Asia.
  // Overland via Myanmar is theoretically possible but not a viable freight route.
  // We treat India↔Asia as ocean for practical logistics purposes.
  if ((rA === "India" && rB === "Asia") || (rA === "Asia" && rB === "India")) return true;

  // Everything else is land-connected:
  // Europe↔Middle East (Turkey), Middle East↔Africa (Sinai),
  // Asia↔Middle East (Central Asia/Iran).
  return false;
}

/** Returns true when ship freight is physically viable (both cities have ports or are near coast). */
export function canShip(a: string, b: string): boolean {
  // Both endpoints need port access. Landlocked cities can't be direct ship endpoints.
  const A = CITIES[a];
  const B = CITIES[b];
  if (!A || !B) return false;
  return !A.landlocked && !B.landlocked;
}

// ─── Transport decision ───────────────────────────────────────────────────────
/**
 * Smart transport selection based on geography, urgency, weight, and distance.
 *
 * Decision matrix:
 *  Ocean route:
 *    High urgency → Air (speed over cost)
 *    Low/Medium + both ports → Ship (cheapest, lowest CO₂ per km)
 *    Low/Medium + no port → Air (no choice)
 *
 *  Land route:
 *    High urgency → Air
 *    Distance > 4000 km → Air (overland that far is impractical)
 *    Weight > 5000 kg → Train (bulk freight, rail is most efficient)
 *    Weight > 1000 kg AND distance > 400 km → Train
 *    Otherwise → Truck (door-to-door, short/medium haul)
 */
export function decideTransport(
  weight: number,
  urgency: Urgency,
  distance: number,
  source: string,
  destination: string,
): Transport {
  const ocean = isOceanRoute(source, destination);
  const shipViable = canShip(source, destination);

  if (ocean) {
    if (urgency === "High") return "Air ✈️";
    if (shipViable)         return "Ship 🚢";
    return "Air ✈️";
  }

  // Land route
  if (urgency === "High")    return "Air ✈️";
  if (distance > 4000)       return "Air ✈️";
  if (weight > 5000)         return "Train 🚆";
  if (weight > 1000 && distance > 400) return "Train 🚆";
  return "Truck 🚛";
}

// ─── ETA ─────────────────────────────────────────────────────────────────────

export function calculateETA(distance: number, transport: Transport): number {
  // Ship adds 48h port handling overhead (loading + unloading).
  const overhead = transport === "Ship 🚢" ? 48 : 2;
  return +(distance / SPEED[transport] + overhead).toFixed(1);
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

export function getRisk(
  urgency: Urgency,
  disruption: Disruption | null,
  traffic: Intensity = 0,
  rain: Intensity = 0,
): Risk {
  let score = urgency === "High" ? 3 : urgency === "Medium" ? 2 : 1;
  if (disruption === "blockage") score += 3;
  if (disruption === "storm")    score += 4; // storms hit ships hard
  score += traffic;
  score += Math.ceil(rain / 1.5);
  if (score >= 6) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

// ─── What-if delay ────────────────────────────────────────────────────────────

export function dynamicDelay(traffic: Intensity, rain: Intensity, transport: Transport): number {
  if (transport === "Air ✈️")   return +(rain * 0.4).toFixed(1);
  if (transport === "Ship 🚢")  return +(rain * 2.5).toFixed(1); // storms delay ships significantly
  if (transport === "Train 🚆") return +(traffic * 0.3 + rain * 0.7).toFixed(1);
  return +(traffic * 1.4 + rain * 0.9).toFixed(1); // truck most affected by ground conditions
}

export function disruptionDelay(d: Disruption, transport: Transport): number {
  if (d === "storm") {
    if (transport === "Ship 🚢") return 36; // storms can delay ships by days
    if (transport === "Air ✈️")  return 6;
    return 2;
  }
  if (d === "traffic") return transport === "Truck 🚛" ? 5 : transport === "Train 🚆" ? 2 : 0;
  if (d === "rain")    return transport === "Air ✈️" ? 3 : transport === "Ship 🚢" ? 8 : 2;
  // blockage
  if (transport === "Truck 🚛") return 8;
  if (transport === "Train 🚆") return 4;
  return 1; // air/ship barely affected by road blockage
}

// ─── Explanation ──────────────────────────────────────────────────────────────

export function explain(transport: Transport, urgency: Urgency, weight: number, oceanRoute: boolean): string {
  if (transport === "Air ✈️")
    return oceanRoute
      ? `Ocean route with high urgency — air freight is the only viable fast option across open water.`
      : `High urgency or long-distance cargo — air freight selected for fastest delivery.`;
  if (transport === "Ship 🚢")
    return `Ocean route, low/medium urgency — sea freight selected for lowest cost (₹1.2/km) and minimal CO₂ per kg.`;
  if (transport === "Train 🚆")
    return `Heavy ${weight.toLocaleString()}kg land cargo — rail chosen for cost-efficient bulk transport at moderate speed.`;
  return `Standard ${urgency.toLowerCase()}-urgency land shipment — truck offers door-to-door flexibility with no terminal overhead.`;
}

// ─── Reasoning bullets ────────────────────────────────────────────────────────

export function buildReasoning(
  transport: Transport,
  urgency: Urgency,
  weight: number,
  distance: number,
  source?: string,
  destination?: string,
): string[] {
  const out: string[] = [];
  const ocean = source && destination ? isOceanRoute(source, destination) : false;
  const srcRegion = source ? CITIES[source]?.region : undefined;
  const dstRegion = destination ? CITIES[destination]?.region : undefined;

  out.push(`Distance ${distance.toLocaleString()} km — ${distance > 8000 ? "intercontinental" : distance > 3000 ? "long-haul" : distance > 500 ? "regional" : "short-haul"} corridor.`);

  if (ocean) {
    out.push(`Ocean-crossing route (${srcRegion ?? source} → ${dstRegion ?? destination}) — Train 🚆 and Truck 🚛 are physically impossible across open water.`);
  } else if (srcRegion !== dstRegion) {
    out.push(`Cross-region overland route: ${srcRegion} → ${dstRegion} — connected by land.`);
  }

  out.push(`Urgency: ${urgency} — ${urgency === "High" ? "speed prioritized, Air selected regardless of cost" : urgency === "Medium" ? "balanced trade-off between speed and cost" : "cost prioritized over speed"}.`);
  out.push(`Cargo weight ${weight.toLocaleString()} kg — ${weight > 5000 ? "heavy bulk load, rail most efficient" : weight > 1000 ? "above truck efficiency threshold" : "standard freight, truck viable"}.`);

  if (transport === "Air ✈️") {
    const reason = ocean ? "only viable fast mode across ocean" : urgency === "High" ? "high urgency demands fastest SLA" : "distance too long for practical overland freight";
    out.push(`Air ✈️ selected: ${reason}. Premium cost justified.`);
  } else if (transport === "Ship 🚢") {
    out.push(`Ship 🚢 selected: ocean route with low/medium urgency — sea freight is the cheapest (₹1.2/km) and lowest CO₂ option across water.`);
    out.push(`Includes ~48h port handling overhead (loading + customs + unloading at destination).`);
  } else if (transport === "Train 🚆") {
    out.push(`Train 🚆 selected: heavy load (${weight.toLocaleString()}kg) on a regional land corridor — rail offers lowest CO₂ per km and predictable schedule.`);
  } else {
    out.push(`Truck 🚛 selected: light-to-medium load on a short/medium land route — door-to-door flexibility, no terminal handover, lowest fixed cost.`);
  }
  return out;
}

// ─── Confidence ───────────────────────────────────────────────────────────────

export function computeConfidence(
  urgency: Urgency,
  risk: Risk,
  disruption: Disruption | null,
  optimized: boolean,
): number {
  let base = 92;
  if (urgency === "Medium") base -= 4;
  if (urgency === "Low")    base -= 2;
  if (risk === "Medium")    base -= 10;
  if (risk === "High")      base -= 22;
  if (disruption)           base -= 6;
  if (optimized)            base += 8;
  return Math.max(35, Math.min(99, Math.round(base)));
}

// ─── Decision timeline ────────────────────────────────────────────────────────

export function buildTimeline(state: {
  hasPlan: boolean;
  disruption: Disruption | null;
  optimized: boolean;
}): DecisionStep[] {
  const { hasPlan, disruption, optimized } = state;
  return [
    {
      id: "shipment",
      label: "Shipment created",
      detail: "Source, destination, weight, urgency captured.",
      status: hasPlan ? "done" : "active",
      icon: "shipment",
    },
    {
      id: "ai",
      label: "AI mode selection",
      detail: "Scored Air / Ship / Train / Truck against urgency, weight, distance, and geography.",
      status: hasPlan ? "done" : "pending",
      icon: "ai",
    },
    {
      id: "disruption",
      label: "Disruption injected",
      detail: disruption
        ? `Real-world event: ${disruption}.`
        : "No disruption yet — simulate one to test resilience.",
      status: disruption ? "done" : hasPlan ? "active" : "pending",
      icon: "disruption",
    },
    {
      id: "predict",
      label: "Impact predicted",
      detail: "ETA, cost, and risk recomputed against new conditions.",
      status: disruption ? "done" : "pending",
      icon: "predict",
    },
    {
      id: "optimize",
      label: "AI re-optimization",
      detail: optimized
        ? "Best alternative transport chosen to minimize ETA + cost penalty."
        : "Awaiting optimize trigger.",
      status: optimized ? "done" : disruption ? "active" : "pending",
      icon: "optimize",
    },
  ];
}
