import { Request, Response } from "express";
import { db, generateId, type ShipmentRow, type DashboardStats } from "./db.js";
import type { RouteResult } from "../../shared/supply-chain.js";

export const handleSaveShipment = (req: Request, res: Response) => {
  const data = req.body as { route: RouteResult };
  const id = generateId();
  const r = data.route;

  db.prepare(
    `INSERT INTO shipments
     (id, source, destination, weight, urgency, transport, eta, base_eta,
      distance, cost, co2, risk, confidence, ocean_route, optimized,
      disruption, warning, suggestion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, r.source, r.destination, r.weight, r.urgency, r.transport, r.eta, r.baseEta,
    r.distance, r.cost, r.co2, r.risk, r.confidence, r.oceanRoute ? 1 : 0, r.optimized ? 1 : 0,
    r.disruption, r.warning, r.suggestion
  );

  db.prepare(
    `INSERT INTO analytics_events (event_type, shipment_id, transport, source, destination)
     VALUES ('plan', ?, ?, ?, ?)`
  ).run(id, r.transport, r.source, r.destination);

  return res.json({ id });
};

export const handleLogAnalyticsEvent = (req: Request, res: Response) => {
  const data = req.body;
  db.prepare(
    `INSERT INTO analytics_events
     (event_type, shipment_id, transport, source, destination, disruption, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.eventType,
    data.shipmentId ?? null,
    data.transport ?? null,
    data.source ?? null,
    data.destination ?? null,
    data.disruption ?? null,
    data.metadata ? JSON.stringify(data.metadata) : null
  );

  return res.json({ ok: true });
};

export const handleGetShipments = (req: Request, res: Response) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const countResult = db.prepare(`SELECT COUNT(*) as total FROM shipments`).get() as { total: number };
  const result = db.prepare(`SELECT * FROM shipments ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit, offset) as ShipmentRow[];

  return res.json({
    shipments: result,
    total: countResult?.total ?? 0,
    limit,
    offset,
  });
};

export const handleGetShipmentById = (req: Request, res: Response) => {
  const id = req.query.id as string;
  const row = db.prepare(`SELECT * FROM shipments WHERE id = ?`).get(id);
  return res.json(row || null);
};

export const handleDeleteShipment = (req: Request, res: Response) => {
  const id = req.body.id;
  db.prepare(`DELETE FROM shipments WHERE id = ?`).run(id);
  return res.json({ ok: true });
};

export const handleGetDashboardStats = (req: Request, res: Response) => {
  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_shipments,
      COALESCE(SUM(distance), 0) as total_distance,
      COALESCE(SUM(cost), 0) as total_cost,
      COALESCE(AVG(eta), 0) as avg_eta,
      COALESCE(AVG(confidence), 0) as avg_confidence
    FROM shipments
  `).get() as any;

  const topRoutesRes = db.prepare(`
    SELECT source, destination, COUNT(*) as count
    FROM shipments
    GROUP BY source, destination
    ORDER BY count DESC
    LIMIT 5
  `).all() as any[];

  const transportRes = db.prepare(`
    SELECT transport, COUNT(*) as count
    FROM shipments
    GROUP BY transport
    ORDER BY count DESC
  `).all() as any[];

  const recentEventsRes = db.prepare(`
    SELECT * FROM analytics_events
    ORDER BY created_at DESC
    LIMIT 20
  `).all() as any[];

  const stats: DashboardStats = {
    totalShipments: totals.total_shipments,
    totalDistance: totals.total_distance,
    totalCost: totals.total_cost,
    avgEta: Math.round(totals.avg_eta * 10) / 10,
    avgConfidence: Math.round(totals.avg_confidence),
    topRoutes: topRoutesRes.map(r => ({
      source: r.source,
      destination: r.destination,
      count: r.count,
    })),
    transportBreakdown: transportRes.map(r => ({
      transport: r.transport,
      count: r.count,
    })),
    recentEvents: recentEventsRes,
  };

  return res.json(stats);
};
