/**
 * Database utility for Cloudflare D1.
 *
 * In dev mode (Vite serve): uses wrangler's getPlatformProxy() to emulate D1.
 * In production (CF Worker): uses cloudflare:workers to access real D1.
 *
 * Tables are auto-created on first access via CREATE TABLE IF NOT EXISTS.
 */

// ─── Minimal D1 type definitions ──────────────────────────────────────────────

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// ─── DB row types ─────────────────────────────────────────────────────────────

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
  ocean_route: number; // 0 | 1
  optimized: number;   // 0 | 1
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

// ─── Schema statements (run individually for compatibility) ───────────────────

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

// ─── Cached DB instance ───────────────────────────────────────────────────────

let cachedDB: D1Database | null = (globalThis as any).__D1_CACHED_DB || null;
let schemaInitialized = (globalThis as any).__D1_SCHEMA_INIT || false;
let initPromise: Promise<void> | null = (globalThis as any).__D1_INIT_PROMISE || null;

/**
 * Initializes the schema by running each CREATE statement individually.
 * Uses a promise lock to prevent concurrent initialization.
 */
async function initSchema(db: D1Database): Promise<void> {
  if (schemaInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      for (const sql of SCHEMA_STATEMENTS) {
        await db.prepare(sql).run();
      }
      schemaInitialized = true;
      (globalThis as any).__D1_SCHEMA_INIT = true;
      console.log("[DB] ✅ Schema initialized — shipments & analytics_events tables ready");
    } catch (err) {
      console.error("[DB] Schema init error:", err);
      // We do not set schemaInitialized to true if it fails, so it can retry
      // but to prevent infinite loops on fatal errors, we can throw
    } finally {
      initPromise = null;
      (globalThis as any).__D1_INIT_PROMISE = null;
    }
  })();

  return initPromise;
}

/**
 * Retrieves the D1 database binding.
 *
 * Dev mode: uses wrangler's getPlatformProxy() which starts a local miniflare
 * instance and provides real D1 bindings backed by a local SQLite file.
 *
 * Production (CF Worker build): uses cloudflare:workers module.
 */
export async function getDB(): Promise<D1Database> {
  if (cachedDB && schemaInitialized) return cachedDB;

  let db: D1Database;

  if (cachedDB) {
    db = cachedDB;
  } else {
    // Check if we're in a Cloudflare Worker runtime (production build)
    const isWorkerRuntime = typeof (globalThis as any).caches !== "undefined"
      && typeof (globalThis as any).HTMLRewriter !== "undefined";

    if (isWorkerRuntime) {
      // Production: access bindings via cloudflare:workers
      try {
        const { env } = await import("cloudflare:workers" as any);
        db = (env as any).DB;
      } catch {
        throw new Error("D1 binding not available in Worker runtime.");
      }
    } else {
      // Dev mode: use wrangler's getPlatformProxy to emulate D1 locally
      try {
        const wrangler = await import("wrangler");
        const proxy = await (wrangler as any).getPlatformProxy({
          configPath: "wrangler.jsonc",
        });
        db = (proxy.env as any).DB;
      } catch (err) {
        throw new Error(
          `Failed to initialize D1 via getPlatformProxy. ` +
          `Make sure 'wrangler' is installed and d1_databases is configured in wrangler.jsonc. ` +
          `Error: ${err}`
        );
      }
    }

    if (!db) {
      throw new Error(
        "D1 database binding 'DB' not found. " +
        "Ensure d1_databases is configured in wrangler.jsonc."
      );
    }

    cachedDB = db;
    (globalThis as any).__D1_CACHED_DB = db;
  }

  // Ensure schema is ready before returning
  await initSchema(db);

  return db;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a short unique ID for shipments. */
export function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `shp_${ts}_${rand}`;
}

