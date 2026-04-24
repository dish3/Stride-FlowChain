<p align="center">
  <img src="https://img.shields.io/badge/FlowChain-AI%20Logistics%20OS-00d4aa?style=for-the-badge&logo=truck&logoColor=white" alt="FlowChain" />
</p>

<h1 align="center">FlowChain — AI Smart Supply Chain</h1>

<p align="center">
  Plan freight routes across 40 global cities, simulate real-world disruptions,<br/>
  and let AI optimize transport mode, ETA, and cost — instantly.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 4" />
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## ✨ What is FlowChain?

FlowChain is an **AI-powered logistics decision system** that helps you plan, simulate, and optimize freight shipments across a global city network. It selects the right transport mode based on geography, urgency, weight, and live conditions — and explains every decision in plain English through a conversational AI co-pilot named **Flo**.

---

## 🚀 Features

### 🤖 AI Route Planning
- Selects optimal transport from **Air ✈️ · Ship 🚢 · Train 🚆 · Truck 🚛** based on:
  - Urgency (High / Medium / Low)
  - Cargo weight
  - Route distance & geography (ocean vs land — Train/Truck blocked on ocean routes)
- Calculates **ETA**, **cost (₹/km)**, and **CO₂ emissions** for every mode
- Confidence score (0–100%) reflecting decision stability

### 🔧 Manual Transport Override
- Pick any transport mode yourself and see live cost, ETA, and CO₂
- Side-by-side comparison table for all 4 modes
- Best values highlighted in green · Impossible modes shown as N/A

### ⚡ Disruption Simulation
- Inject real-world events:
  - **Land routes** → Traffic · Rain · Blockage
  - **Ocean routes** → Storm · Rain · Port Block
- ETA, risk level, and confidence recalculate instantly
- What-if sliders for continuous traffic/rain intensity (0–High)

### 🧠 AI Re-optimization
- After a disruption, AI scores all viable modes with disruption penalties
- Shows rejected alternatives with reasons (e.g. *"Road blockage makes truck unreliable"*)
- Before / After comparison panel with time saved, cost delta, CO₂ reduction

### 🗺️ Live Maps
- **MapTiler** — dark vector map with animated route drawing and moving vehicle emoji
- **Google Maps** — real road directions via Directions API for Truck/Train routes
- Great-circle arc for Air routes · Curved sea lane for Ship routes
- Vehicle follows actual road path, rotates to face direction of travel
- Satellite / Hybrid / Roadmap toggle on Google Maps

### 🌦️ Live Weather
- Real-time weather at source and destination via **OpenWeatherMap**
- Temperature · Humidity · Wind speed · Visibility
- Severity badges (Severe / Adverse / Clear) with logistics impact warnings

### 💬 Flo — AI Conversational Co-pilot
- Narrates every plan, disruption, and optimization in real time
- Full chat interface — type any question and get context-aware answers
- Understands: *"Why air?" · "Compare all modes" · "What's the CO₂ impact?" · "Should I optimize?"*
- Quick-question chips for one-click answers

### 📊 Decision Timeline
- 5-step visual timeline: **Shipment → AI Selection → Disruption → Impact → Optimization**
- Each step shows current status (done / active / pending)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [TanStack Start](https://tanstack.com/start) (SSR, React 19) |
| **Routing** | TanStack Router (file-based) |
| **Styling** | Tailwind CSS v4 + shadcn/ui (Radix UI, New York style) |
| **Maps** | MapLibre GL + Google Maps JS API |
| **Directions** | Google Directions API |
| **Weather** | OpenWeatherMap API |
| **Server Functions** | TanStack Start `createServerFn` |
| **Deployment** | Cloudflare Workers (via `@cloudflare/vite-plugin`) |
| **Language** | TypeScript 5.8 |
| **Build** | Vite 7 |

---

## 🌍 City Network

40 cities across 6 regions:

| Region | Cities |
|---|---|
| 🇮🇳 **India** | Mumbai · Delhi · Bangalore · Chennai · Kolkata · Hyderabad · Pune · Ahmedabad · Jaipur · Surat |
| 🌏 **Asia** | Shanghai · Beijing · Tokyo · Singapore · Bangkok · Seoul · Kuala Lumpur · Jakarta · Hong Kong |
| 🇪🇺 **Europe** | London · Paris · Frankfurt · Amsterdam · Rotterdam · Madrid · Milan · Warsaw |
| 🌎 **Americas** | New York · Los Angeles · Chicago · São Paulo · Mexico City · Toronto |
| 🕌 **Middle East** | Dubai · Riyadh · Istanbul |
| 🌍 **Africa** | Lagos · Nairobi · Cairo · Johannesburg |

---

## 🧮 Transport Decision Logic

```
Ocean route (crosses Arabian Sea, Indian Ocean, Atlantic, Pacific, etc.)
  ├── High urgency          → Air ✈️
  ├── Both cities have ports → Ship 🚢
  └── No port access        → Air ✈️

Land route
  ├── High urgency          → Air ✈️
  ├── Distance > 4,000 km   → Air ✈️
  ├── Weight > 5,000 kg     → Train 🚆
  ├── Weight > 1,000 kg AND distance > 400 km → Train 🚆
  └── Otherwise             → Truck 🚛
```

> Ocean routes are detected by region-pair rules and explicit city-pair overrides. India ↔ Middle East, India ↔ Europe, Asia ↔ Europe, Africa ↔ Europe, and anything ↔ Americas are all ocean routes.

---

## 📐 Key Calculations

| Metric | Formula |
|---|---|
| **ETA** | `distance / speed + overhead` — Air: +2h, Ship: +48h port handling, Land: +2h |
| **Cost** | `distance × cost_per_km` — Air: ₹12, Ship: ₹1.2, Train: ₹4, Truck: ₹6 |
| **CO₂** | `distance × co2_per_km` — Air: 0.85, Ship: 0.015, Train: 0.05, Truck: 0.18 kg/km |
| **Confidence** | Base 92% adjusted for urgency, risk level, disruption, and optimization |
| **Optimizer** | `eta × 10 + cost × 0.05 + disruption_penalty` — lowest score wins |

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **bun**

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_MAPTILER_KEY=your_maptiler_key
VITE_GOOGLE_MAPS_KEY=your_google_maps_key
```

| Variable | Where to get it |
|---|---|
| `VITE_MAPTILER_KEY` | Free key at [maptiler.com](https://www.maptiler.com/) |
| `VITE_GOOGLE_MAPS_KEY` | Enable **Maps JavaScript API** + **Directions API** at [console.cloud.google.com](https://console.cloud.google.com/) |

> **Note:** The app works without API keys — it falls back to a built-in SVG world map.

### Run

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

### Build

```bash
npm run build
```

### Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

---

## 📁 Project Structure

```
src/
├── routes/
│   ├── __root.tsx                    # HTML shell, global meta
│   └── index.tsx                     # Main page — all state and layout
├── components/
│   ├── supply-chain/
│   │   ├── AIExplanationPanel.tsx    # AI reasoning bullets
│   │   ├── AssistantPanel.tsx        # Flo chat panel
│   │   ├── ComparisonPanel.tsx       # Before/after optimization
│   │   ├── ConfidenceGauge.tsx       # SVG arc confidence meter
│   │   ├── DecisionTimeline.tsx      # 5-step decision flow
│   │   ├── ImpactPanel.tsx           # Time/cost/CO₂ delta cards
│   │   ├── MapView.tsx              # Map provider switcher
│   │   ├── RiskBadge.tsx            # Low/Medium/High badge
│   │   ├── StatCard.tsx             # ETA/Distance/Cost/CO₂ cards
│   │   ├── TransportSelector.tsx    # Manual mode picker + comparison table
│   │   ├── WeatherWidget.tsx        # Live weather at source/destination
│   │   ├── WhatIfControls.tsx       # Traffic/rain intensity sliders
│   │   └── map/
│   │       ├── GoogleMapsView.tsx   # Google Maps with real directions
│   │       ├── MapLibreView.tsx     # MapTiler with road routing
│   │       └── useDrawProgress.ts   # Route animation hooks
│   └── ui/                          # shadcn/ui primitives (Radix-based)
├── lib/
│   ├── assistant.ts                 # Flo message factory + chat reply engine
│   ├── supply-chain.ts             # Core types, constants, pure logic functions
│   └── utils.ts                     # cn() helper
├── hooks/                           # Custom React hooks
├── server/
│   └── supply-chain.functions.ts    # Server functions (planRoute, optimizeRoute, etc.)
├── router.tsx                       # TanStack Router configuration
├── routeTree.gen.ts                 # Auto-generated route tree
└── styles.css                       # Design system — oklch colors, gradients, animations
```

---

## 🎯 Demo Flow

1. **Open the app** — Mumbai → Dubai auto-loads with AI recommendation
2. **Change cities** — pick any of 40 global cities across 6 regions
3. **Switch transport** — use the Transport Mode selector to compare all options
4. **Check weather** — live conditions at source and destination
5. **Simulate disruption** — click Traffic / Rain / Block (or Storm for ocean routes)
6. **AI Optimize** — watch the AI re-evaluate all modes and explain its choice
7. **Ask Flo** — type *"compare all modes"* or *"why ship?"* in the chat panel

---

## 🛠️ Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run build:dev` | Development build (unminified) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run push:files` | Commit and push each changed file separately |

To preview the per-file GitHub push workflow without changing Git history, run:

```bash
npm run push:files -- --dry-run
```

You can also push selected files only:

```bash
npm run push:files -- src/routes/index.tsx README.md
```

---

## 📄 License

MIT
