# FlowChain - AI Smart Supply Chain

FlowChain is an AI-powered logistics decision system for planning, simulating, and optimizing freight routes across a global city network. It recommends a transport mode, estimates ETA, cost, CO2 emissions, risk, and explains decisions through the Flo assistant.

The project is now split into a standalone React client, an Express API server, and shared supply-chain logic.

## Features

- AI route planning across 40 global cities.
- Transport mode recommendation for Air, Ship, Train, and Truck.
- Manual transport override with side-by-side ETA, cost, and CO2 comparison.
- Disruption simulation for traffic, rain, blockage, and storm events.
- What-if controls for traffic and rain intensity.
- AI re-optimization after disruption.
- Flo conversational assistant powered by Gemini when the server API key is configured.
- Shipment history, analytics events, and dashboard stats backed by local SQLite.
- MapLibre/MapTiler route view with Google Maps support when API keys are available.
- Client-side fallback planner when the API server is unavailable.

## Current Architecture

| Area | Stack |
|---|---|
| Client | React 19, TypeScript, Vite 7 |
| Routing | TanStack Router |
| Data fetching | TanStack Query plus local API wrappers |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI, lucide-react |
| Maps | MapLibre GL, MapTiler, Google Maps JavaScript API |
| Server | Express, TypeScript, tsx |
| AI | Google Gemini API |
| Database | better-sqlite3 local SQLite database |
| Shared logic | TypeScript modules in `shared/` and client/server adapters |

## Project Structure

```text
.
+-- client/
|   +-- src/
|   |   +-- components/
|   |   |   +-- supply-chain/        # FlowChain app panels, map views, controls
|   |   |   +-- ui/                  # shadcn/ui primitives
|   |   +-- hooks/                   # Client hooks
|   |   +-- lib/                     # API client, assistant, DB helpers, utilities
|   |   +-- routes/                  # TanStack Router pages
|   |   +-- main.tsx                 # Client entry
|   |   +-- styles.css               # Tailwind/design system
|   +-- package.json
|   +-- vite.config.ts
+-- server/
|   +-- src/
|   |   +-- index.ts                 # Express server and API routes
|   |   +-- supply-chain.ts          # Route planning API handlers
|   |   +-- gemini.ts                # Flo/Gemini API handler
|   |   +-- db.ts                    # SQLite connection
|   |   +-- db-functions.ts          # Shipment/history/stat handlers
|   +-- package.json
+-- shared/
|   +-- supply-chain.ts              # Shared logistics types and pure logic
+-- src/                             # Legacy/source compatibility files
+-- migrations/                      # Database migration assets
+-- scripts/                         # Utility scripts
+-- package.json                     # Root workspace-style scripts
+-- tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

From the repository root:

```bash
npm run install:all
```

This installs dependencies for the root project, `client/`, and `server/`.

### Configure environment

Create the client env file:

```bash
cp client/.env.example client/.env
```

Client variables:

```env
VITE_API_URL=http://localhost:3001
VITE_MAPTILER_KEY=your_maptiler_key_here
VITE_GOOGLE_MAPS_KEY=your_google_maps_key_here
```

Create the server env file:

```bash
cp server/.env.example server/.env
```

Server variables:

```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
MAPTILER_KEY=your_maptiler_key_here
```

API keys are optional for basic route planning. Without the API server, the client falls back to local route-planning logic for core planning actions.

### Run locally

Start the API server:

```bash
npm run dev:server
```

In a second terminal, start the client:

```bash
npm run dev:client
```

The client runs on the Vite dev URL, usually:

```text
http://localhost:5173
```

The API server runs on:

```text
http://localhost:3001
```

### Build

Build the client:

```bash
npm run build:client
```

Build the server:

```bash
npm run build:server
```

## API Routes

The Express server exposes these endpoints under `/api`:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/planRoute` | Generate an AI transport recommendation |
| POST | `/api/planRouteWithTransport` | Plan using a manually selected transport mode |
| POST | `/api/simulateDisruption` | Apply a traffic, rain, blockage, or storm event |
| POST | `/api/applyWhatIf` | Apply traffic/rain intensity sliders |
| POST | `/api/optimizeRoute` | Re-score viable modes after disruption |
| POST | `/api/geminiChat` | Ask Flo a context-aware question |
| POST | `/api/saveShipment` | Save a shipment plan |
| POST | `/api/logAnalyticsEvent` | Store analytics events |
| GET | `/api/getShipments` | List saved shipment history |
| GET | `/api/getShipmentById` | Load one saved shipment |
| POST | `/api/deleteShipment` | Delete a saved shipment |
| GET | `/api/getDashboardStats` | Load dashboard summary stats |

## Transport Decision Logic

```text
Ocean route
  - High urgency -> Air
  - Both cities have ports -> Ship
  - No port access -> Air

Land route
  - High urgency -> Air
  - Distance > 4,000 km -> Air
  - Weight > 5,000 kg -> Train
  - Weight > 1,000 kg and distance > 400 km -> Train
  - Otherwise -> Truck
```

## Key Calculations

| Metric | Formula |
|---|---|
| ETA | `distance / speed + overhead` |
| Cost | `distance * cost_per_km` |
| CO2 | `distance * co2_per_km` |
| Confidence | Base confidence adjusted by urgency, risk, disruption, and optimization |
| Optimizer | Scores viable modes by ETA, cost, and disruption penalties |

## Demo Flow

1. Open the client app.
2. Pick source and destination cities.
3. Set urgency and cargo weight.
4. Compare recommended and manual transport modes.
5. Simulate disruption or adjust what-if controls.
6. Run optimization and review the before/after impact.
7. Ask Flo about the decision or saved route history.

## Scripts

| Command | Description |
|---|---|
| `npm run install:all` | Install root, client, and server dependencies |
| `npm run dev:client` | Start the Vite client dev server |
| `npm run dev:server` | Start the Express API server with `tsx watch` |
| `npm run build:client` | Build the React client |
| `npm run build:server` | Compile the TypeScript server |
| `npm run restructure` | Run the project restructuring/finalization helper |

Client-only scripts can also be run from `client/`, and server-only scripts can be run from `server/`.

## Notes

- The root `package.json` no longer exposes a single `npm run dev`; run the client and server separately.
- The client expects the server URL from `VITE_API_URL`.
- Server data is stored in a local SQLite database through `better-sqlite3`.
- `.workspace/` and `.wrangler/` contain local development/runtime state from the current project setup.

## License

MIT
