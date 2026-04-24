import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
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
  mapType?: "roadmap" | "satellite" | "hybrid";
}

const containerStyle = { width: "100%", height: "100%" };

const darkStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1b2a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1b2a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ad9c2" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1b4332" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a2540" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1f3b4d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a5a6e" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

/** Decode a Google Maps encoded polyline into lat/lng pairs. */
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b: number;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/** Generate a great-circle arc between two points (for Air routes). */
function greatCircleArc(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  steps = 80,
): Array<{ lat: number; lng: number }> {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat), lng1 = toRad(a.lng);
  const lat2 = toRad(b.lat), lng2 = toRad(b.lng);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2));
  const pts: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    pts.push({ lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: toDeg(Math.atan2(y, x)) });
  }
  return pts;
}

/** Generate a curved sea lane arc (slightly offset from great circle to look like a shipping lane). */
function seaLaneArc(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  steps = 60,
): Array<{ lat: number; lng: number }> {
  // Use great circle but add a slight southward bulge to mimic real shipping lanes
  const arc = greatCircleArc(a, b, steps);
  const midIdx = Math.floor(steps / 2);
  // Add a small offset at the midpoint to curve the route slightly
  const latOffset = (b.lat - a.lat) * 0.08;
  const lngOffset = (b.lng - a.lng) * 0.05;
  return arc.map((pt, i) => {
    const bulge = Math.sin((i / steps) * Math.PI); // 0 at ends, 1 at middle
    return {
      lat: pt.lat - latOffset * bulge,
      lng: pt.lng + lngOffset * bulge,
    };
  });
}

export function GoogleMapsView({
  source,
  destination,
  optimized,
  disrupted,
  transport,
  apiKey,
  mapType = "roadmap",
}: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ["geometry"],
  });

  const a = CITIES[source];
  const b = CITIES[destination];
  const mapRef = useRef<google.maps.Map | null>(null);
  const renderCount = useRef(0);
  const [, forceRender] = useState(0);

  const isShip = isShipTransport(transport);
  const isAirTransport = transport?.includes("Air") ?? false;
  const isLandTransport = !isShip && !isAirTransport;

  // Route path state — filled by Directions API for land, or computed for air/sea
  const [routePath, setRoutePath] = useState<Array<{ lat: number; lng: number }> | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [directionsError, setDirectionsError] = useState(false);

  // Line color
  const stroke = optimized ? "#73ffb8" : disrupted ? "#f59e0b" : isShip ? "#38bdf8" : isAirTransport ? "#a78bfa" : "#2dd4a8";

  const center = useMemo(
    () => ({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }),
    [a, b],
  );

  // Fetch real directions for land routes (Truck/Train)
  const fetchDirections = useCallback(() => {
    if (!isLoaded || !isLandTransport) return;
    setDirectionsError(false);
    const svc = new google.maps.DirectionsService();
    const travelMode = transport?.includes("Train")
      ? google.maps.TravelMode.TRANSIT
      : google.maps.TravelMode.DRIVING;

    svc.route(
      {
        origin: { lat: a.lat, lng: a.lng },
        destination: { lat: b.lat, lng: b.lng },
        travelMode: google.maps.TravelMode.DRIVING, // use driving for road freight
        avoidFerries: false,
        avoidHighways: false,
        optimizeWaypoints: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          // Decode the overview polyline for the full route path
          const encoded = result.routes[0]?.overview_polyline;
          if (encoded) {
            const path = decodePolyline(encoded);
            setRoutePath(path);
            // Get actual road distance in km
            const meters = result.routes[0]?.legs?.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0) ?? 0;
            setRouteDistance(Math.round(meters / 1000));
          }
        } else {
          // Directions API failed (e.g. no road route) — fall back to straight line
          setDirectionsError(true);
          setRoutePath(null);
        }
      },
    );
  }, [isLoaded, isLandTransport, a, b, transport]);

  // Compute air/sea paths
  useEffect(() => {
    if (!isLoaded) return;
    if (isAirTransport) {
      setRoutePath(greatCircleArc(a, b));
      setRouteDistance(null);
    } else if (isShip) {
      setRoutePath(seaLaneArc(a, b));
      setRouteDistance(null);
    } else {
      // Land route — fetch from Directions API
      fetchDirections();
    }
  }, [isLoaded, isAirTransport, isShip, a, b, fetchDirections]);

  // Fit map bounds
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const bounds = new google.maps.LatLngBounds();
    if (routePath && routePath.length > 0) {
      routePath.forEach((pt) => bounds.extend(pt));
    } else {
      bounds.extend({ lat: a.lat, lng: a.lng });
      bounds.extend({ lat: b.lat, lng: b.lng });
    }
    mapRef.current.fitBounds(bounds, 80);
  }, [a, b, isLoaded, routePath]);

  // Animation
  const drawProgress = useDrawProgress(`gm:${source}->${destination}:${transport ?? ""}`);
  const loopMs = vehicleLoopMs(transport);
  const vehicleProgress = useVehicleProgress(
    `gm:${source}->${destination}:veh:${transport ?? ""}`,
    drawProgress,
    loopMs,
  );

  useEffect(() => {
    renderCount.current += 1;
    forceRender(renderCount.current);
  }, [drawProgress, vehicleProgress]);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--brand-deep)] p-6 text-center text-sm text-warning">
        Google Maps failed to load. Check that the key is enabled for the Maps JavaScript API.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--brand-deep)] text-sm text-muted-foreground">
        Loading Google Maps…
      </div>
    );
  }

  // Animated path — slice the full route path up to drawProgress
  const fullPath = routePath ?? [{ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }];
  const animatedCount = Math.max(2, Math.round(fullPath.length * drawProgress));
  const animatedPath = fullPath.slice(0, animatedCount);

  // Vehicle position — interpolate along the full path
  const vehicleIdx = Math.min(
    fullPath.length - 1,
    Math.floor(fullPath.length * vehicleProgress),
  );
  const vehiclePos = drawProgress >= 1 && fullPath.length > 0
    ? fullPath[vehicleIdx]
    : null;

  const emoji = vehicleEmoji(transport);
  const isAirEmoji = emoji === "✈️";

  // Bearing for vehicle rotation — use actual path direction
  const vehicleBearing = (() => {
    if (!vehiclePos || vehicleIdx <= 0) return 0;
    const prev = fullPath[Math.max(0, vehicleIdx - 1)];
    return bearingDeg(prev, vehiclePos);
  })();

  const rotation = isAirEmoji
    ? vehicleBearing - 45
    : vehiclePos && fullPath[vehicleIdx + 1]
      ? (fullPath[vehicleIdx + 1].lng < vehiclePos.lng ? 180 : 0)
      : 0;

  const vehicleSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
       <g transform="rotate(${rotation} 22 22)">
         <text x="22" y="30" text-anchor="middle" font-size="28">${emoji}</text>
       </g>
     </svg>`,
  )}`;

  // Ship: dashed sea lane; Air: solid arc; Land: solid road
  const polylineOptions: google.maps.PolylineOptions = {
    strokeColor: stroke,
    strokeOpacity: isShip ? 0 : 0.95,
    strokeWeight: isShip ? 5 : isAirTransport ? 3 : 5,
    icons: isShip
      ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: stroke, scale: 4 }, offset: "0", repeat: "16px" }]
      : isAirTransport
        ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.6, strokeColor: stroke, scale: 2 }, offset: "0", repeat: "20px" }]
        : undefined,
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={5}
      onLoad={(m) => { mapRef.current = m; }}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: mapType === "roadmap" ? darkStyles : undefined,
        backgroundColor: "#0d1b2a",
        mapTypeId: mapType,
      }}
    >
      {/* Route polyline */}
      <Polyline path={animatedPath} options={polylineOptions} />

      {/* City markers */}
      {[{ c: a, label: source }, { c: b, label: destination }].map(({ c, label }) => (
        <Marker
          key={label}
          position={{ lat: c.lat, lng: c.lng }}
          label={{ text: label, color: "#0d1b2a", fontWeight: "700", fontSize: "12px" }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: stroke,
            fillOpacity: 1,
            strokeColor: stroke,
            strokeOpacity: 0.3,
            strokeWeight: 8,
          }}
        />
      ))}

      {/* Moving vehicle */}
      {vehiclePos && drawProgress >= 1 && (
        <Marker
          position={vehiclePos}
          icon={{
            url: vehicleSvg,
            scaledSize: new google.maps.Size(44, 44),
            anchor: new google.maps.Point(22, 22),
          }}
          zIndex={999}
        />
      )}

      {/* Road distance info overlay (only for land routes with real directions) */}
      {isLandTransport && routeDistance && !directionsError && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            background: "rgba(13,27,42,0.85)",
            border: "1px solid rgba(45,212,168,0.3)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            color: "#9ad9c2",
            backdropFilter: "blur(4px)",
            pointerEvents: "none",
          }}
        >
          🛣️ Road distance: {routeDistance.toLocaleString()} km
        </div>
      )}

      {/* Fallback notice if directions failed */}
      {directionsError && isLandTransport && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            background: "rgba(13,27,42,0.85)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            color: "#f59e0b",
            backdropFilter: "blur(4px)",
            pointerEvents: "none",
          }}
        >
          ⚠️ Road routing unavailable — showing straight-line path
        </div>
      )}
    </GoogleMap>
  );
}
