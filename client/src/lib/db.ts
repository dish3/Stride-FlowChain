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
