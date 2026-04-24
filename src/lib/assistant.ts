// Rule-based conversational responses for the FlowChain AI assistant.
// Generates friendly, human-like commentary on routing events + handles user chat.

import type { Disruption, RouteResult } from "./supply-chain";
import { COST_PER_KM, CO2_PER_KM, SPEED, CITIES } from "./supply-chain";

export type AssistantRole = "ai" | "user";

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  text: string;
  ts: number;
  tag?: "plan" | "disruption" | "optimize" | "whatif" | "intro" | "chat";
}

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function introMessage(): AssistantMessage {
  return {
    id: id(),
    role: "ai",
    tag: "intro",
    ts: Date.now(),
    text: "Hi! I'm Flo, your logistics co-pilot. Plan a shipment and I'll explain every decision in plain English. You can also ask me anything — try *\"why air?\"* or *\"compare all modes\"*. ✨",
  };
}

export function planMessages(r: RouteResult): AssistantMessage[] {
  const why =
    r.transport.startsWith("Air")
      ? `it's ${r.urgency.toLowerCase()}-urgency cargo and air gives the fastest door-to-door SLA`
      : r.transport.startsWith("Train")
        ? `the load is ${r.weight} kg — rail is the most cost-efficient way to move that much weight`
        : `it's a ${r.weight} kg ${r.urgency.toLowerCase()}-urgency shipment and trucks give the best door-to-door flexibility`;

  const lines: string[] = [
    `Plan ready for **${r.source} → ${r.destination}** (${r.distance.toLocaleString()} km).`,
    `I'm recommending **${r.transport}** because ${why}.`,
    `Expected arrival in **${r.eta} h** at about **₹${r.cost.toLocaleString()}**, with **${r.co2} kg** of CO₂. I'm **${r.confidence}%** confident in this call.`,
  ];

  return lines.map((text) => ({ id: id(), role: "ai" as AssistantRole, tag: "plan" as const, ts: Date.now(), text }));
}

export function disruptionMessages(r: RouteResult, d: Disruption): AssistantMessage[] {
  const delay = +(r.eta - r.baseEta).toFixed(1);
  const headline =
    d === "rain"
      ? `Heads up — heavy rain just hit the corridor. ☔`
      : d === "traffic"
        ? `Traffic alert on the route. 🚧`
        : `Road blockage reported on the corridor. ⛔`;

  const impact =
    delay > 0
      ? `That pushes ETA from ${r.baseEta} h to **${r.eta} h** (≈ +${delay} h delay).`
      : `Good news — your transport mode is shrugging it off, ETA is unchanged.`;

  const risk =
    r.risk === "High"
      ? `Risk just jumped to **High** — I'd suggest re-optimizing.`
      : r.risk === "Medium"
        ? `Risk is now **Medium** — manageable, but worth a look.`
        : `Risk is still **Low**, no action needed.`;

  return [headline, impact, risk].map((text) => ({
    id: id(),
    role: "ai" as AssistantRole,
    tag: "disruption" as const,
    ts: Date.now(),
    text,
  }));
}

export function optimizeMessages(before: RouteResult, after: RouteResult): AssistantMessage[] {
  const switched = before.transport !== after.transport;
  const etaDelta = +(before.eta - after.eta).toFixed(1);
  const costDelta = after.cost - before.cost;
  const co2Delta = +(before.co2 - after.co2).toFixed(1);

  const headline = switched
    ? `Switching from **${before.transport}** to **${after.transport}** — better fit for current conditions. ⚡`
    : `Sticking with **${after.transport}** — still the strongest option. I tightened the plan instead. ✅`;

  const win =
    etaDelta > 0
      ? `Saves about **${etaDelta} h** of delay`
      : etaDelta < 0
        ? `Costs ${Math.abs(etaDelta)} h more, but improves reliability`
        : `Same ETA, better resilience`;

  const cost =
    costDelta === 0
      ? `at the same cost`
      : costDelta < 0
        ? `and trims **₹${Math.abs(costDelta).toLocaleString()}** off the bill`
        : `for ₹${costDelta.toLocaleString()} extra (worth it for the SLA)`;

  const co2 =
    co2Delta > 0 ? ` and cuts CO₂ by ${co2Delta} kg 🌱.` : co2Delta < 0 ? `.` : `.`;

  return [
    headline,
    `${win} ${cost}${co2}`,
    `Confidence is now **${after.confidence}%** — ${after.confidence >= 80 ? "rock solid." : after.confidence >= 60 ? "looking good." : "keep an eye on it."}`,
  ].map((text) => ({ id: id(), role: "ai" as AssistantRole, tag: "optimize" as const, ts: Date.now(), text }));
}

export function whatIfMessage(r: RouteResult): AssistantMessage | null {
  const traffic = r.trafficLevel;
  const rain = r.rainLevel;
  if (traffic === 0 && rain === 0) return null;
  const parts: string[] = [];
  if (traffic > 0) parts.push(`${["", "light", "moderate", "heavy"][traffic]} traffic`);
  if (rain > 0) parts.push(`${["", "light", "moderate", "heavy"][rain]} rain`);
  const delay = +(r.eta - r.baseEta).toFixed(1);
  return {
    id: id(),
    role: "ai",
    tag: "whatif",
    ts: Date.now(),
    text: `Simulating ${parts.join(" + ")} — ETA shifts to **${r.eta} h**${delay > 0 ? ` (+${delay} h)` : ""}, risk **${r.risk}**.`,
  };
}

// ─── Chat reply engine ────────────────────────────────────────────────────────

function makeAI(text: string): AssistantMessage {
  return { id: id(), role: "ai", tag: "chat", ts: Date.now(), text };
}

function makeUser(text: string): AssistantMessage {
  return { id: id(), role: "user", ts: Date.now(), text };
}

/**
 * Generate a context-aware reply to a free-text user message.
 * Returns [userMessage, aiReply].
 */
export function chatReply(
  input: string,
  route: RouteResult | null,
): [AssistantMessage, AssistantMessage] {
  const user = makeUser(input);
  const q = input.toLowerCase().trim();

  // ── No route planned yet ──────────────────────────────────────────────────
  if (!route) {
    if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
      return [user, makeAI("Hey! Plan a shipment first using the form on the left, then I can answer detailed questions about your route. 👋")];
    }
    return [user, makeAI("I don't have a route to analyse yet. Fill in the shipment form and click **Plan Route** — then ask me anything!")];
  }

  const r = route;
  const airCost = Math.round(r.distance * COST_PER_KM["Air ✈️"]);
  const trainCost = Math.round(r.distance * COST_PER_KM["Train 🚆"]);
  const truckCost = Math.round(r.distance * COST_PER_KM["Truck 🚛"]);
  const airEta = +(r.distance / SPEED["Air ✈️"] + 2).toFixed(1);
  const trainEta = +(r.distance / SPEED["Train 🚆"] + 2).toFixed(1);
  const truckEta = +(r.distance / SPEED["Truck 🚛"] + 2).toFixed(1);
  const airCo2 = +(r.distance * CO2_PER_KM["Air ✈️"]).toFixed(1);
  const trainCo2 = +(r.distance * CO2_PER_KM["Train 🚆"]).toFixed(1);
  const truckCo2 = +(r.distance * CO2_PER_KM["Truck 🚛"]).toFixed(1);

  const srcRegion = CITIES[r.source]?.region ?? r.source;
  const dstRegion = CITIES[r.destination]?.region ?? r.destination;

  // ── Greetings ─────────────────────────────────────────────────────────────
  if (q.match(/^(hi|hello|hey|sup|yo)\b/)) {
    return [user, makeAI(`Hey! I'm tracking your **${r.source} → ${r.destination}** shipment. What do you want to know?`)];
  }

  // ── Why this transport? ───────────────────────────────────────────────────
  if (q.match(/why.*(air|plane|fly|flight)/)) {
    return [user, makeAI(
      r.transport.startsWith("Air")
        ? `Air was chosen because urgency is **${r.urgency}** and the distance is **${r.distance.toLocaleString()} km**. At ₹${airCost.toLocaleString()} it's the most expensive option, but it delivers in **${airEta} h** vs ${trainEta} h by train or ${truckEta} h by truck. When SLA matters, air wins.`
        : `Air wasn't selected here. Urgency is **${r.urgency}** and weight is **${r.weight} kg** — the cost premium (₹${airCost.toLocaleString()} vs ₹${r.cost.toLocaleString()} for ${r.transport}) isn't justified for this shipment.`
    )];
  }

  if (q.match(/why.*(train|rail)/)) {
    return [user, makeAI(
      r.transport.startsWith("Train")
        ? `Train was chosen because the cargo is **${r.weight} kg** — heavy loads benefit from rail's bulk efficiency. At ₹${trainCost.toLocaleString()} it's **${Math.round((1 - trainCost / airCost) * 100)}% cheaper than air** and emits only **${trainCo2} kg CO₂** vs ${airCo2} kg by air.`
        : `Train wasn't selected. For this route (${r.distance.toLocaleString()} km, ${r.urgency} urgency, ${r.weight} kg), **${r.transport}** scored better on the combined ETA + cost + disruption matrix.`
    )];
  }

  if (q.match(/why.*(truck|road|drive)/)) {
    return [user, makeAI(
      r.transport.startsWith("Truck")
        ? `Truck was chosen for door-to-door flexibility. At **${r.weight} kg** and **${r.urgency.toLowerCase()} urgency**, there's no need for terminal handover. Cost is ₹${truckCost.toLocaleString()} — the most economical option for this load.`
        : `Truck wasn't selected. The ${r.disruption ? "active disruption" : r.urgency === "High" ? "high urgency" : `${r.weight} kg weight`} made **${r.transport}** the better call for this corridor.`
    )];
  }

  if (q.match(/why.*(this|chosen|selected|recommend|pick|chose|decision)/)) {
    return [user, makeAI(
      `**${r.transport}** was selected based on three factors: urgency (**${r.urgency}**), weight (**${r.weight} kg**), and distance (**${r.distance.toLocaleString()} km**). ` +
      (r.transport.startsWith("Air") ? `High urgency always triggers air freight — speed over cost.` :
       r.transport.startsWith("Train") ? `Heavy cargo over a regional corridor makes rail the most efficient choice.` :
       `Light-to-medium cargo with standard urgency gets truck — best flexibility, lowest overhead.`)
    )];
  }

  // ── Cost questions ────────────────────────────────────────────────────────
  if (q.match(/cost|price|expensive|cheap|₹|rupee|money|budget/)) {
    return [user, makeAI(
      `Current cost: **₹${r.cost.toLocaleString()}** via ${r.transport} (₹${(r.cost / r.distance).toFixed(1)}/km).\n\nFull comparison for ${r.distance.toLocaleString()} km:\n• ✈️ Air — ₹${airCost.toLocaleString()}\n• 🚆 Train — ₹${trainCost.toLocaleString()}\n• 🚛 Truck — ₹${truckCost.toLocaleString()}\n\nTrain is **${Math.round((1 - trainCost / airCost) * 100)}% cheaper** than air for this route.`
    )];
  }

  // ── ETA / time questions ──────────────────────────────────────────────────
  if (q.match(/eta|time|how long|when|arrive|arrival|fast|speed|duration|delay/)) {
    const delayNote = r.eta !== r.baseEta
      ? ` Current disruption adds **+${(r.eta - r.baseEta).toFixed(1)} h** delay.`
      : "";
    return [user, makeAI(
      `ETA via ${r.transport}: **${r.eta} h**.${delayNote}\n\nAll modes for ${r.distance.toLocaleString()} km:\n• ✈️ Air — ${airEta} h\n• 🚆 Train — ${trainEta} h\n• 🚛 Truck — ${truckEta} h\n\nAir is **${Math.round((truckEta - airEta) / truckEta * 100)}% faster** than truck.`
    )];
  }

  // ── CO₂ / environment questions ───────────────────────────────────────────
  if (q.match(/co2|carbon|emission|environment|green|eco|climate|footprint|sustain/)) {
    return [user, makeAI(
      `CO₂ for this route (${r.distance.toLocaleString()} km):\n• ✈️ Air — **${airCo2} kg** (highest)\n• 🚛 Truck — **${truckCo2} kg**\n• 🚆 Train — **${trainCo2} kg** (lowest)\n\nCurrent plan emits **${r.co2} kg**. Switching to train would save **${+(r.co2 - trainCo2).toFixed(1)} kg** of CO₂ — a **${Math.round((r.co2 - trainCo2) / r.co2 * 100)}% reduction**. 🌱`
    )];
  }

  // ── Compare all modes ─────────────────────────────────────────────────────
  if (q.match(/compare|comparison|all mode|vs|versus|alternative|option/)) {
    const isOcean = (r as any).oceanRoute;
    const shipCost = Math.round(r.distance * COST_PER_KM["Ship 🚢"]);
    const shipEta  = +(r.distance / SPEED["Ship 🚢"] + 48).toFixed(1);
    const shipCo2  = +(r.distance * CO2_PER_KM["Ship 🚢"]).toFixed(1);

    const rows = isOcean
      ? `| ✈️ Air | ${airEta}h | ₹${airCost.toLocaleString()} | ${airCo2}kg |\n| 🚢 Ship | ${shipEta}h | ₹${shipCost.toLocaleString()} | ${shipCo2}kg |\n| 🚆 Train | ❌ impossible | — | — |\n| 🚛 Truck | ❌ impossible | — | — |`
      : `| ✈️ Air | ${airEta}h | ₹${airCost.toLocaleString()} | ${airCo2}kg |\n| 🚆 Train | ${trainEta}h | ₹${trainCost.toLocaleString()} | ${trainCo2}kg |\n| 🚛 Truck | ${truckEta}h | ₹${truckCost.toLocaleString()} | ${truckCo2}kg |`;

    return [user, makeAI(
      `Here's the full comparison for **${r.source} → ${r.destination}** (${r.distance.toLocaleString()} km, ${r.weight} kg, ${r.urgency} urgency):\n\n` +
      `| Mode | ETA | Cost | CO₂ |\n|------|-----|------|-----|\n${rows}\n\n` +
      (isOcean
        ? `This is an **ocean route** — Train and Truck are physically impossible. Ship is cheapest but slow (${shipEta}h). Air is fastest.`
        : `**Recommended: ${r.transport}** ← best fit for your urgency + weight profile.`)
    )];
  }

  // ── Risk questions ────────────────────────────────────────────────────────
  if (q.match(/risk|safe|danger|reliable|reliability/)) {
    const riskExplain =
      r.risk === "High"
        ? `Risk is **High** — active disruption combined with ${r.urgency} urgency. I'd strongly recommend hitting **AI Optimize**.`
        : r.risk === "Medium"
          ? `Risk is **Medium** — conditions are manageable but worth monitoring. Consider optimizing if the disruption persists.`
          : `Risk is **Low** — conditions are stable and the route is on track.`;
    return [user, makeAI(riskExplain)];
  }

  // ── Disruption questions ──────────────────────────────────────────────────
  if (q.match(/disrupt|traffic|rain|block|weather|storm|congestion|ocean|sea/)) {
    if (r.disruption) {
      const disruptionName = r.disruption === "storm" ? "ocean storm 🌊" : r.disruption;
      return [user, makeAI(
        `Active disruption: **${disruptionName}**. This added **+${(r.eta - r.baseEta).toFixed(1)} h** to the ETA (${r.baseEta}h → ${r.eta}h) and pushed risk to **${r.risk}**. ` +
        `Click **AI Optimize** and I'll evaluate whether switching transport mode recovers the delay.`
      )];
    }
    const disruptionHint = (r as any).oceanRoute
      ? `Use **Storm**, **Rain**, or **Port Block** buttons to simulate ocean disruptions.`
      : `Use the **Traffic**, **Rain**, or **Block** buttons to simulate disruptions.`;
    return [user, makeAI(`No active disruption right now. ${disruptionHint}`)];
  }

  // ── Confidence questions ──────────────────────────────────────────────────
  if (q.match(/confidence|certain|sure|accurate|trust|reliable/)) {
    return [user, makeAI(
      `Confidence is **${r.confidence}%** — this reflects how stable the decision is under current conditions. ` +
      (r.confidence >= 80 ? `High confidence means urgency, risk, and disruption signals all align with the chosen mode.` :
       r.confidence >= 60 ? `Moderate confidence — there's some uncertainty due to ${r.risk.toLowerCase()} risk or active disruption.` :
       `Low confidence — the current conditions are challenging. Re-optimizing is strongly advised.`)
    )];
  }

  // ── Distance / route questions ────────────────────────────────────────────
  if (q.match(/distance|far|km|kilomet|how far|route|corridor/)) {
    return [user, makeAI(
      `The **${r.source} → ${r.destination}** corridor is **${r.distance.toLocaleString()} km** (straight-line haversine). ` +
      `This is a **${srcRegion} → ${dstRegion}** route — ${srcRegion !== dstRegion ? "cross-region, so air freight is the primary viable mode." : "same-region, so all three modes are viable."}`
    )];
  }

  // ── Optimize questions ────────────────────────────────────────────────────
  if (q.match(/optim|re.?route|switch|better|improve|suggest/)) {
    if (!r.disruption && r.trafficLevel === 0 && r.rainLevel === 0) {
      return [user, makeAI(`No disruption is active right now, so there's nothing to optimize against. Trigger a disruption first (Traffic / Rain / Block), then hit **AI Optimize** and I'll evaluate all three modes.`)];
    }
    return [user, makeAI(`There's an active ${r.disruption ?? "condition"} on the route. Click **AI Optimize** above and I'll score Air, Train, and Truck against current conditions — including disruption penalties — and explain exactly why each mode was accepted or rejected.`)];
  }

  // ── Weight questions ──────────────────────────────────────────────────────
  if (q.match(/weight|heavy|light|cargo|load|kg|tonne/)) {
    return [user, makeAI(
      `Current cargo: **${r.weight.toLocaleString()} kg**. ` +
      (r.weight > 1000
        ? `That's a heavy load — above 1,000 kg, rail becomes the most cost-efficient mode for regional routes.`
        : r.weight > 500
          ? `Medium load — truck handles this well for short-to-medium hauls, train for longer corridors.`
          : `Light load — truck is ideal. Rail's bulk efficiency doesn't kick in until you're moving heavier freight.`)
    )];
  }

  // ── What-if questions ─────────────────────────────────────────────────────
  if (q.match(/what if|scenario|simulate|hypothetical|suppose|imagine/)) {
    return [user, makeAI(
      `Use the **What-if Simulation** sliders on the left to model traffic and rain intensity from 0 to High. I'll recalculate ETA and risk in real time. You can also click the disruption buttons to inject a specific event.`
    )];
  }

  // ── Urgency questions ─────────────────────────────────────────────────────
  if (q.match(/urgent|urgency|priority|sla|deadline|express/)) {
    return [user, makeAI(
      `Urgency is set to **${r.urgency}**. ` +
      (r.urgency === "High"
        ? `High urgency always triggers air freight — speed is the top priority regardless of cost.`
        : r.urgency === "Medium"
          ? `Medium urgency balances speed and cost. If the route is long or heavy, train may be preferred.`
          : `Low urgency prioritises cost. Truck is usually the best fit unless the load is very heavy.`)
    )];
  }

  // ── Help / capabilities ───────────────────────────────────────────────────
  if (q.match(/help|what can|what do|capabilit|feature|ask/)) {
    return [user, makeAI(
      `Here's what you can ask me:\n\n• **"Why air / train / truck?"** — explain the transport decision\n• **"Compare all modes"** — full ETA, cost, CO₂ table\n• **"What's the cost?"** — breakdown by mode\n• **"How long will it take?"** — ETA comparison\n• **"CO₂ impact?"** — emissions by mode\n• **"What's the risk?"** — current risk level explained\n• **"Is there a disruption?"** — active event status\n• **"How confident are you?"** — confidence score explained\n• **"What if there's traffic?"** — simulation guidance\n• **"Should I optimize?"** — optimization advice`
    )];
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  const fallbacks = [
    `I'm not sure I caught that. Try asking about **cost**, **ETA**, **CO₂**, **risk**, or say **"compare all modes"** for a full breakdown.`,
    `Hmm, I didn't quite get that. You can ask me things like *"why was air chosen?"* or *"what's the cheapest option?"*.`,
    `I'm best at logistics questions! Try *"compare all modes"*, *"what's the CO₂ impact?"*, or *"should I optimize?"*.`,
  ];
  return [user, makeAI(fallbacks[Math.floor(Math.random() * fallbacks.length)])];
}
