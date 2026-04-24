import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CITIES } from "@/lib/supply-chain";
import {
  bearingDeg,
  isShipTransport,
  useDrawProgress,
  useVehicleProgress,
  vehicleEmoji,
  vehicleLoopMs,
} from "./useDrawProgress";

interface Props {
  source: string;
  destination: string;
  optimized: boolean;
  disrupted: boolean;
  transport?: string;
  apiKey: string;
  googleApiKey?: string;
}

/** Decode Google Maps encoded polyline */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b: number;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lng / 1e5, lat / 1e5]); // GeoJSON is [lng, lat]
  }
  return points;
}

/** Great-circle arc for air routes */
function greatCircleArc(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  steps = 80,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat), lng1 = toRad(a.lng);
  const lat2 = toRad(b.lat), lng2 = toRad(b.lng);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2));
  if (d === 0) return [[a.lng, a.lat], [b.lng, b.lat]];
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    pts.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return pts;
}

/** Curved sea lane arc */
function seaLaneArc(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  steps = 60,
): [number, number][] {
  const arc = greatCircleArc(a, b, steps);
  const latOffset = (b.lat - a.lat) * 0.08;
  const lngOffset = (b.lng - a.lng) * 0.05;
  return arc.map(([lng, lat], i) => {
    const bulge = Math.sin((i / steps) * Math.PI);
    return [lng + lngOffset * bulge, lat - latOffset * bulge] as [number, number];
  });
}

export function MapLibreView({
  source,
  destination,
  optimized,
  disrupted,
  transport,
  apiKey,
  googleApiKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const vehicleElRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [fullPath, setFullPath] = useState<[number, number][]>([]);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null);
  const [directionsError, setDirectionsError] = useState(false);

  const a = CITIES[source];
  const b = CITIES[destination];
  const isShip = isShipTransport(transport);
  const isAir = transport?.includes("Air") ?? false;
  const isLand = !isShip && !isAir;

  const stroke = optimized ? "#73ffb8" : disrupted ? "#f59e0b" : isShip ? "#38bdf8" : isAir ? "#a78bfa" : "#2dd4a8";

  // Compute the full route path
  useEffect(() => {
    if (isAir) {
      setFullPath(greatCircleArc(a, b));
      setRoadDistanceKm(null);
      setDirectionsError(false);
      return;
    }
    if (isShip) {
      setFullPath(seaLaneArc(a, b));
      setRoadDistanceKm(null);
      setDirectionsError(false);
      return;
    }
    // Land route — fetch real road directions from Google
    if (!googleApiKey) {
      setFullPath([[a.lng, a.lat], [b.lng, b.lat]]);
      return;
    }
    setDirectionsError(false);
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&mode=driving&key=${googleApiKey}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "OK" && data.routes?.[0]) {
          const encoded = data.routes[0].overview_polyline?.points;
          if (encoded) {
            setFullPath(decodePolyline(encoded));
            const meters = data.routes[0].legs?.reduce(
              (sum: number, leg: { distance?: { value: number } }) => sum + (leg.distance?.value ?? 0), 0,
            ) ?? 0;
            setRoadDistanceKm(Math.round(meters / 1000));
          }
        } else {
          setDirectionsError(true);
          setFullPath([[a.lng, a.lat], [b.lng, b.lat]]);
        }
      })
      .catch(() => {
        setDirectionsError(true);
        setFullPath([[a.lng, a.lat], [b.lng, b.lat]]);
      });
  }, [a, b, isAir, isShip, googleApiKey]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${apiKey}`,
      center: [(a.lng + b.lng) / 2, (a.lat + b.lat) / 2],
      zoom: 4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#2dd4a8", "line-width": 10, "line-opacity": 0.15, "line-blur": 6 },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#2dd4a8", "line-width": 4, "line-opacity": 0.95 },
      });
      setReady(true);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers and fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    [{ c: a, label: source }, { c: b, label: destination }].forEach(({ c, label }) => {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="width:14px;height:14px;border-radius:9999px;background:${stroke};box-shadow:0 0 0 6px ${stroke}33;"></div>
          <div style="background:${stroke};color:#0d1b2a;font-weight:700;font-size:12px;padding:2px 8px;border-radius:6px;white-space:nowrap;">${label}</div>
        </div>`;
      markersRef.current.push(
        new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([c.lng, c.lat]).addTo(map),
      );
    });

    if (fullPath.length > 1) {
      const bounds = new maplibregl.LngLatBounds(fullPath[0], fullPath[0]);
      fullPath.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { padding: 80, duration: 800, maxZoom: 7 });
    } else {
      const bounds = new maplibregl.LngLatBounds([a.lng, a.lat], [a.lng, a.lat]);
      bounds.extend([b.lng, b.lat]);
      map.fitBounds(bounds, { padding: 80, duration: 800, maxZoom: 6 });
    }
  }, [a, b, source, destination, stroke, ready, fullPath]);

  // Animate route line
  const drawProgress = useDrawProgress(`ml:${source}->${destination}:${transport ?? ""}`);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || fullPath.length < 2) return;

    map.setPaintProperty("route-line", "line-color", stroke);
    map.setPaintProperty("route-glow", "line-color", stroke);
    map.setPaintProperty("route-line", "line-width", isShip ? 5 : isAir ? 3 : 5);
    map.setPaintProperty("route-line", "line-dasharray",
      isShip ? [4, 3] : isAir ? [3, 2] : disrupted ? [2, 1.5] : [1, 0],
    );

    const count = Math.max(2, Math.round(fullPath.length * drawProgress));
    const coords = fullPath.slice(0, count);

    const src = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {},
      });
    }
  }, [fullPath, drawProgress, stroke, isShip, isAir, disrupted, ready]);

  // Vehicle marker
  const loopMs = vehicleLoopMs(transport);
  const vehicleProgress = useVehicleProgress(
    `ml:${source}->${destination}:veh:${transport ?? ""}`,
    drawProgress,
    loopMs,
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || fullPath.length < 2) return;

    const emoji = vehicleEmoji(transport);

    if (drawProgress < 1) {
      vehicleMarkerRef.current?.remove();
      vehicleMarkerRef.current = null;
      vehicleElRef.current = null;
      return;
    }

    if (!vehicleMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText = "font-size:24px;line-height:1;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.7));transform-origin:center;will-change:transform;";
      el.textContent = emoji;
      vehicleElRef.current = el;
      vehicleMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(fullPath[0])
        .addTo(map);
    } else if (vehicleElRef.current && vehicleElRef.current.textContent !== emoji) {
      vehicleElRef.current.textContent = emoji;
    }

    // Interpolate position along the actual path
    const idx = Math.min(fullPath.length - 1, Math.floor(fullPath.length * vehicleProgress));
    const [lng, lat] = fullPath[idx];
    vehicleMarkerRef.current.setLngLat([lng, lat]);

    if (vehicleElRef.current) {
      if (emoji === "✈️") {
        // Use actual path bearing for plane rotation
        const prevIdx = Math.max(0, idx - 1);
        const [pLng, pLat] = fullPath[prevIdx];
        const bearing = bearingDeg({ lat: pLat, lng: pLng }, { lat, lng });
        vehicleElRef.current.style.transform = `rotate(${bearing - 45}deg)`;
      } else {
        // Mirror when going west
        const nextIdx = Math.min(fullPath.length - 1, idx + 1);
        const [nLng] = fullPath[nextIdx];
        vehicleElRef.current.style.transform = nLng < lng ? "scaleX(-1)" : "scaleX(1)";
      }
    }
  }, [fullPath, drawProgress, vehicleProgress, transport, ready]);

  // Cleanup vehicle on route change
  useEffect(() => {
    return () => {
      vehicleMarkerRef.current?.remove();
      vehicleMarkerRef.current = null;
      vehicleElRef.current = null;
    };
  }, [source, destination]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {/* Road distance badge */}
      {isLand && roadDistanceKm && !directionsError && (
        <div className="absolute bottom-2 left-2 rounded-lg border border-primary/30 bg-[var(--brand-deep)]/80 px-2.5 py-1 text-[11px] text-primary backdrop-blur-sm pointer-events-none">
          🛣️ Road: {roadDistanceKm.toLocaleString()} km
        </div>
      )}
      {directionsError && isLand && (
        <div className="absolute bottom-2 left-2 rounded-lg border border-warning/30 bg-[var(--brand-deep)]/80 px-2.5 py-1 text-[11px] text-warning backdrop-blur-sm pointer-events-none">
          ⚠️ Road routing unavailable
        </div>
      )}
    </div>
  );
}
