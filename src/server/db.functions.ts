import { createServerFn } from "@tanstack/react-start";
import {
  getDB,
  generateId,
  type ShipmentRow,
  type AnalyticsRow,
  type DashboardStats,
} from "@/lib/db";
import type { RouteResult } from "@/lib/supply-chain";

// ─── Save a planned shipment ──────────────────────────────────────────────────

export const saveShipment = createServerFn({ method: "POST" })
  .inputValidator((input: { route: RouteResult }) => input)
  .handler(async ({ data }) => {
    const db = await getDB();
    const id = generateId();
    const r = data.route;

    await db
      .prepare(
        `INSERT INTO shipments
         (id, source, destination, weight, urgency, transport, eta, base_eta,
          distance, cost, co2, risk, confidence, ocean_route, optimized,
          disruption, warning, suggestion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        r.source,
        r.destination,
        r.weight,
        r.urgency,
        r.transport,
        r.eta,
        r.baseEta,
        r.distance,
        r.cost,
        r.co2,
        r.risk,
        r.confidence,
        r.oceanRoute ? 1 : 0,
        r.optimized ? 1 : 0,
        r.disruption,
        r.warning,
        r.suggestion,
      )
      .run();

    // Log analytics event
    await db
      .prepare(
        `INSERT INTO analytics_events (event_type, shipment_id, transport, source, destination)
         VALUES ('plan', ?, ?, ?, ?)`
      )
      .bind(id, r.transport, r.source, r.destination)
      .run();

    return { id };
  });

// ─── Log analytics event (disruption, optimize, what-if) ─────────────────────

export const logAnalyticsEvent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      eventType: string;
      shipmentId?: string;
      transport?: string;
      source?: string;
      destination?: string;
      disruption?: string;
      metadata?: Record<string, unknown>;
    }) => input
  )
  .handler(async ({ data }) => {
    const db = await getDB();
    await db
      .prepare(
        `INSERT INTO analytics_events
         (event_type, shipment_id, transport, source, destination, disruption, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        data.eventType,
        data.shipmentId ?? null,
        data.transport ?? null,
        data.source ?? null,
        data.destination ?? null,
        data.disruption ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      )
      .run();

    return { ok: true };
  });

// ─── Get shipment history ─────────────────────────────────────────────────────

export const getShipments = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number; offset?: number }) => ({
    limit: Math.min(100, Math.max(1, input.limit ?? 50)),
    offset: Math.max(0, input.offset ?? 0),
  }))
  .handler(async ({ data }) => {
    const db = await getDB();

    const countResult = await db
      .prepare(`SELECT COUNT(*) as total FROM shipments`)
      .first<{ total: number }>();

    const result = await db
      .prepare(
        `SELECT * FROM shipments ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(data.limit, data.offset)
      .all<ShipmentRow>();

    return {
      shipments: result.results,
      total: countResult?.total ?? 0,
      limit: data.limit,
      offset: data.offset,
    };
  });

// ─── Get a single shipment ───────────────────────────────────────────────────

export const getShipmentById = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const db = await getDB();
    const row = await db
      .prepare(`SELECT * FROM shipments WHERE id = ?`)
      .bind(data.id)
      .first<ShipmentRow>();
    return row;
  });

// ─── Delete a shipment ───────────────────────────────────────────────────────

export const deleteShipment = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const db = await getDB();
    await db
      .prepare(`DELETE FROM shipments WHERE id = ?`)
      .bind(data.id)
      .run();
    return { ok: true };
  });

// ─── Dashboard analytics ─────────────────────────────────────────────────────

export const getDashboardStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const db = await getDB();

    // Run all queries in a batch for performance
    const [
      totalsRes,
      topRoutesRes,
      transportRes,
      recentEventsRes,
    ] = await db.batch([
      db.prepare(`
        SELECT
          COUNT(*) as total_shipments,
          COALESCE(SUM(distance), 0) as total_distance,
          COALESCE(SUM(cost), 0) as total_cost,
          COALESCE(AVG(eta), 0) as avg_eta,
          COALESCE(AVG(confidence), 0) as avg_confidence
        FROM shipments
      `),
      db.prepare(`
        SELECT source, destination, COUNT(*) as count
        FROM shipments
        GROUP BY source, destination
        ORDER BY count DESC
        LIMIT 5
      `),
      db.prepare(`
        SELECT transport, COUNT(*) as count
        FROM shipments
        GROUP BY transport
        ORDER BY count DESC
      `),
      db.prepare(`
        SELECT * FROM analytics_events
        ORDER BY created_at DESC
        LIMIT 20
      `),
    ]);

    const totals = (totalsRes as any).results[0] ?? {
      total_shipments: 0,
      total_distance: 0,
      total_cost: 0,
      avg_eta: 0,
      avg_confidence: 0,
    };

    const stats: DashboardStats = {
      totalShipments: totals.total_shipments,
      totalDistance: totals.total_distance,
      totalCost: totals.total_cost,
      avgEta: Math.round(totals.avg_eta * 10) / 10,
      avgConfidence: Math.round(totals.avg_confidence),
      topRoutes: ((topRoutesRes as any).results ?? []).map((r: any) => ({
        source: r.source,
        destination: r.destination,
        count: r.count,
      })),
      transportBreakdown: ((transportRes as any).results ?? []).map(
        (r: any) => ({
          transport: r.transport,
          count: r.count,
        })
      ),
      recentEvents: (recentEventsRes as any).results ?? [],
    };

    return stats;
  });
