import Database from "better-sqlite3";
import path from "path";

export interface ShipmentRow {
  id: string;
  source: string;
  destination: string;
  weight: number;
  urgency: string;
  transport: string;
  eta: number;
  base_eta: number;
  distance: number;
  cost: number;
  co2: number;
  risk: string;
  confidence: number;
  ocean_route: number;
  optimized: number;
  disruption: string | null;
  warning: string | null;
  suggestion: string | null;
  created_at: string;
}

export interface AnalyticsRow {
  id: number;
  event_type: string;
  shipment_id: string | null;
  transport: string | null;
  source: string | null;
  destination: string | null;
  disruption: string | null;
  metadata: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalShipments: number;
  totalDistance: number;
  totalCost: number;
  avgEta: number;
  avgConfidence: number;
  topRoutes: Array<{ source: string; destination: string; count: number }>;
  transportBreakdown: Array<{ transport: string; count: number }>;
  recentEvents: AnalyticsRow[];
}

const db = new Database(path.join(process.cwd(), "data.db"));

db.pragma('journal_mode = WAL');

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    weight INTEGER NOT NULL,
    urgency TEXT NOT NULL,
    transport TEXT NOT NULL,
    eta REAL NOT NULL,
    base_eta REAL NOT NULL,
    distance INTEGER NOT NULL,
    cost INTEGER NOT NULL,
    co2 REAL NOT NULL,
    risk TEXT NOT NULL,
    confidence INTEGER NOT NULL,
    ocean_route INTEGER NOT NULL DEFAULT 0,
    optimized INTEGER NOT NULL DEFAULT 0,
    disruption TEXT,
    warning TEXT,
    suggestion TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    shipment_id TEXT,
    transport TEXT,
    source TEXT,
    destination TEXT,
    disruption TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_shipments_source ON shipments(source)`,
  `CREATE INDEX IF NOT EXISTS idx_shipments_destination ON shipments(destination)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC)`,
];

for (const stmt of SCHEMA_STATEMENTS) {
  db.prepare(stmt).run();
}

export function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `shp_${ts}_${rand}`;
}

export { db };
