import { useState } from "react";
import { CITIES } from "@/lib/supply-chain";
import { useDrawProgress } from "./map/useDrawProgress";
import { MapLibreView } from "./map/MapLibreView";
import { GoogleMapsView } from "./map/GoogleMapsView";

interface MapViewProps {
  source: string;
  destination: string;
  optimized: boolean;
  disrupted: boolean;
  transport?: string;
}

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

type Provider = "maptiler" | "google";
export type GoogleMapType = "roadmap" | "satellite" | "hybrid";

export function MapView(props: MapViewProps) {
  const hasMaptiler = Boolean(MAPTILER_KEY);
  const hasGoogle = Boolean(GOOGLE_KEY);
  const [provider, setProvider] = useState<Provider>(hasMaptiler ? "maptiler" : "google");
  const [googleMapType, setGoogleMapType] = useState<GoogleMapType>("roadmap");

  const showFallback = !hasMaptiler && !hasGoogle;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-[var(--brand-deep)]">
      {(hasMaptiler || hasGoogle) && (
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <ProviderToggle
            provider={provider}
            setProvider={setProvider}
            hasMaptiler={hasMaptiler}
            hasGoogle={hasGoogle}
          />
          {provider === "google" && hasGoogle && (
            <GoogleMapTypeToggle value={googleMapType} setValue={setGoogleMapType} />
          )}
        </div>
      )}

      {showFallback ? (
        <FallbackMap {...props} />
      ) : provider === "maptiler" && hasMaptiler ? (
        <MapLibreView {...props} apiKey={MAPTILER_KEY!} googleApiKey={GOOGLE_KEY} />
      ) : hasGoogle ? (
        <GoogleMapsView {...props} apiKey={GOOGLE_KEY!} mapType={googleMapType} />
      ) : (
        <MapLibreView {...props} apiKey={MAPTILER_KEY!} googleApiKey={GOOGLE_KEY} />
      )}
    </div>
  );
}

function ProviderToggle({
  provider,
  setProvider,
  hasMaptiler,
  hasGoogle,
}: {
  provider: Provider;
  setProvider: (p: Provider) => void;
  hasMaptiler: boolean;
  hasGoogle: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background/80 p-1 text-xs backdrop-blur">
      <button
        type="button"
        disabled={!hasMaptiler}
        onClick={() => setProvider("maptiler")}
        className={`rounded-full px-3 py-1 font-medium transition ${
          provider === "maptiler"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        MapTiler
      </button>
      <button
        type="button"
        disabled={!hasGoogle}
        onClick={() => setProvider("google")}
        className={`rounded-full px-3 py-1 font-medium transition ${
          provider === "google"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        Google
      </button>
    </div>
  );
}

function GoogleMapTypeToggle({
  value,
  setValue,
}: {
  value: GoogleMapType;
  setValue: (v: GoogleMapType) => void;
}) {
  const opts: { id: GoogleMapType; label: string }[] = [
    { id: "roadmap", label: "Roadmap" },
    { id: "satellite", label: "Satellite" },
    { id: "hybrid", label: "Hybrid" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background/80 p-1 text-xs backdrop-blur animate-fade-in">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setValue(o.id)}
          className={`rounded-full px-3 py-1 font-medium transition ${
            value === o.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FallbackMap({ source, destination, optimized, disrupted, transport }: MapViewProps) {
  const a = CITIES[source];
  const b = CITIES[destination];
  const isShip = transport?.includes("Ship");

  // Simple equirectangular world projection onto a 600×340 canvas.
  const project = (lat: number, lng: number) => ({
    x: ((lng + 180) / 360) * 600,
    y: ((85 - lat) / 170) * 340,
  });

  const pa = project(a.lat, a.lng);
  const pb = project(b.lat, b.lng);
  // Ship = ocean blue, optimized = mint, disrupted = amber, default = teal
  const stroke = optimized ? "#73ffb8" : disrupted ? "#f59e0b" : isShip ? "#38bdf8" : "#2dd4a8";

  const progress = useDrawProgress(`fallback:${source}->${destination}`);
  const lineLength = Math.hypot(pb.x - pa.x, pb.y - pa.y);
  const dashOffset = lineLength * (1 - progress);

  return (
    <svg viewBox="0 0 600 340" className="h-full w-full">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#1b4332" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0d1b2a" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="600" height="340" fill="url(#bg)" />

      {/* Subtle world grid lines */}
      {[-60, -30, 0, 30, 60].map((lat) => {
        const y = ((85 - lat) / 170) * 340;
        return <line key={`lat${lat}`} x1="0" y1={y} x2="600" y2={y} stroke="#2dd4a8" strokeOpacity="0.08" strokeWidth="1" />;
      })}
      {[-120, -60, 0, 60, 120].map((lng) => {
        const x = ((lng + 180) / 360) * 600;
        return <line key={`lng${lng}`} x1={x} y1="0" x2={x} y2="340" stroke="#2dd4a8" strokeOpacity="0.08" strokeWidth="1" />;
      })}

      {/* Route line — ship gets a dashed sea-lane style */}
      <line
        x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
        stroke={stroke}
        strokeWidth={isShip ? 4 : 3}
        strokeDasharray={
          disrupted ? "8 6" :
          isShip ? "10 6" :
          `${lineLength} ${lineLength}`
        }
        strokeDashoffset={disrupted || isShip ? 0 : dashOffset}
        opacity="0.9"
      />

      {/* City markers */}
      {[{ p: pa, label: source }, { p: pb, label: destination }].map(({ p, label }) => (
        <g key={label}>
          <circle cx={p.x} cy={p.y} r="9" fill={stroke} />
          <circle cx={p.x} cy={p.y} r="14" fill={stroke} opacity="0.25" />
          <text x={p.x + 14} y={p.y + 4} fill="#e6fff7" fontSize="12" fontWeight="600">
            {label}
          </text>
        </g>
      ))}

      {/* Transport label in corner */}
      {isShip && (
        <text x="10" y="330" fill={stroke} fontSize="11" opacity="0.7">
          🚢 Sea freight route
        </text>
      )}
    </svg>
  );
}
