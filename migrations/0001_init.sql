-- FlowChain D1 Database Schema
-- Run with: npx wrangler d1 execute flowchain-db --local --file=migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  weight INTEGER NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High')),
  transport TEXT NOT NULL,
  eta REAL NOT NULL,
  base_eta REAL NOT NULL,
  distance INTEGER NOT NULL,
  cost INTEGER NOT NULL,
  co2 REAL NOT NULL,
  risk TEXT NOT NULL CHECK (risk IN ('Low', 'Medium', 'High')),
  confidence INTEGER NOT NULL,
  ocean_route INTEGER NOT NULL DEFAULT 0,
  optimized INTEGER NOT NULL DEFAULT 0,
  disruption TEXT,
  warning TEXT,
  suggestion TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,  -- 'plan', 'disrupt', 'optimize', 'whatif'
  shipment_id TEXT,
  transport TEXT,
  source TEXT,
  destination TEXT,
  disruption TEXT,
  metadata TEXT,  -- JSON blob
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_source ON shipments(source);
CREATE INDEX IF NOT EXISTS idx_shipments_destination ON shipments(destination);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
