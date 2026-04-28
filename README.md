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
|   +-- tsconfig.json
+-- server/
|   +-- src/
|   |   +-- index.ts                 # Express server and API routes
|   |   +-- supply-chain.ts          # Route planning API handlers
|   |   +-- gemini.ts                # Flo/Gemini API handler
|   |   +-- db.ts                    # SQLite connection
|   |   +-- db-functions.ts          # Shipment/history/stat handlers
|   +-- dist/                        # Compiled TypeScript output (after build)
|   +-- package.json
|   +-- tsconfig.json
+-- shared/
|   +-- supply-chain.ts              # Shared logistics types and pure logic
+-- migrations/
|   +-- 0001_init.sql                # Database schema initialization
+-- scripts/
|   +-- per-file-push.mjs            # Utility script for deployment
+-- package.json                     # Root workspace scripts
+-- tsconfig.json                    # Root TypeScript config
```

## Getting Started

### Prerequisites

- Node.js 18+ (with npm)
- For native dependencies: Python 3.x and a C++ compiler (required for `better-sqlite3` compilation)

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

**Environment variable notes:**
- `VITE_API_URL`: Required for client to communicate with the server. Defaults to `http://localhost:3001` in development.
- `VITE_MAPTILER_KEY` and `VITE_GOOGLE_MAPS_KEY`: Optional. Without these, the client falls back to MapLibre GL with basic map tiles.
- `GEMINI_API_KEY`: Optional. Without this, the Flo assistant will not be available, but core route planning works.
- `MAPTILER_KEY`: Optional. Used by the server for enhanced map features.

Without the API server running, the client falls back to local route-planning logic for core planning actions.

### Run locally

Start the API server (compiles TypeScript on first run):

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

The SQLite database is created automatically on first server startup at `data.db` in the root directory.

### Build

Build the client:

```bash
npm run build:client
```

Build the server (compiles TypeScript to `server/dist/`):

```bash
npm run build:server
```

Run the compiled server:

```bash
npm run start --prefix server
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

**Request/Response Format:**
- All endpoints accept and return JSON.
- POST endpoints expect a JSON body with parameters specific to each route.
- GET endpoints may accept query parameters (e.g., `?id=shipment-123`).
- Errors are returned with appropriate HTTP status codes and error messages in the response body.

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
| `npm run dev:client` | Start the Vite client dev server on port 5173 |
| `npm run dev:server` | Start the Express API server with `tsx watch` on port 3001 |
| `npm run build:client` | Build the React client for production |
| `npm run build:server` | Compile the TypeScript server to `server/dist/` |
| `npm run restructure` | Run the project restructuring/finalization helper |

Client-only scripts can also be run from `client/` (e.g., `npm run dev --prefix client`), and server-only scripts can be run from `server/` (e.g., `npm run build --prefix server`).

## Notes

- The root `package.json` provides workspace-level scripts. Run `npm run dev:client` and `npm run dev:server` in separate terminals.
- The client expects the server URL from `VITE_API_URL` environment variable.
- Server data is stored in a local SQLite database (`data.db`) using `better-sqlite3`.
- The database schema is defined in `migrations/0001_init.sql` and is initialized automatically on first server startup.
- `.workspace/` contains local development logs and state.
- `.wrangler/` contains Wrangler CLI state (if using Cloudflare Workers deployment).

## Troubleshooting

**Server fails to start with "better-sqlite3" error:**
- Ensure you have Python 3.x and a C++ compiler installed (Visual Studio Build Tools on Windows, Xcode on macOS, build-essential on Linux).
- Try deleting `node_modules/` and `server/node_modules/` and running `npm run install:all` again.

**Client cannot connect to server:**
- Verify the server is running on port 3001.
- Check that `VITE_API_URL` in `client/.env` matches the server URL.
- Check browser console for CORS errors.

**Database errors on startup:**
- Ensure `data.db` is not locked by another process.
- Try deleting `data.db` and `data.db-*` files to reset the database.

**Gemini assistant not responding:**
- Verify `GEMINI_API_KEY` is set in `server/.env`.
- Check that the API key is valid and has quota remaining.

## License

MIT
