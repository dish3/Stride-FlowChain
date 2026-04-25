import { useEffect, useState } from "react";
import { Cloud, CloudRain, CloudSnow, Sun, Wind, Thermometer, Eye, Droplets, AlertTriangle } from "lucide-react";
import { CITIES } from "@/lib/supply-chain";
import { cn } from "@/lib/utils";

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  visibility: number;
  description: string;
  icon: string;
  main: string;
  city: string;
}

interface WeatherWidgetProps {
  source: string;
  destination: string;
}

const OWM_KEY = "b6907d289e10d714a6e88b30761fae22"; // OpenWeatherMap free demo key

async function fetchWeather(city: string): Promise<WeatherData | null> {
  const c = CITIES[city];
  if (!c) return null;
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${c.lat}&lon=${c.lng}&appid=${OWM_KEY}&units=metric`,
    );
    if (!res.ok) return null;
    const d = await res.json();
    return {
      temp: Math.round(d.main.temp),
      feels_like: Math.round(d.main.feels_like),
      humidity: d.main.humidity,
      wind_speed: Math.round(d.wind.speed * 3.6), // m/s → km/h
      visibility: Math.round((d.visibility ?? 10000) / 1000),
      description: d.weather[0]?.description ?? "",
      icon: d.weather[0]?.icon ?? "01d",
      main: d.weather[0]?.main ?? "Clear",
      city: d.name ?? city,
    };
  } catch {
    return null;
  }
}

function WeatherIcon({ main, className }: { main: string; className?: string }) {
  const cls = cn("shrink-0", className);
  if (main === "Rain" || main === "Drizzle") return <CloudRain className={cls} />;
  if (main === "Snow") return <CloudSnow className={cls} />;
  if (main === "Clouds") return <Cloud className={cls} />;
  if (main === "Thunderstorm") return <AlertTriangle className={cls} />;
  return <Sun className={cls} />;
}

function weatherTone(main: string): string {
  if (main === "Rain" || main === "Drizzle" || main === "Thunderstorm") return "text-sky-400";
  if (main === "Snow") return "text-blue-300";
  if (main === "Clouds") return "text-slate-400";
  return "text-amber-400";
}

function WeatherCard({ city, data, loading }: { city: string; data: WeatherData | null; loading: boolean }) {
  const tone = data ? weatherTone(data.main) : "text-muted-foreground";

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold truncate">{city}</p>
        {data && (
          <span className={cn("text-[10px] uppercase tracking-wider font-medium", tone)}>
            {data.main}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-1.5">
          <div className="h-3 w-16 animate-pulse rounded bg-secondary/60" />
          <div className="h-3 w-12 animate-pulse rounded bg-secondary/60" />
        </div>
      ) : data ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <WeatherIcon main={data.main} className={cn("h-6 w-6", tone)} />
            <span className="text-2xl font-semibold tracking-tight">{data.temp}°C</span>
          </div>
          <p className="text-[11px] text-muted-foreground capitalize mb-2">{data.description}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              <span>Feels {data.feels_like}°C</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              <span>{data.humidity}% humidity</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="h-3 w-3" />
              <span>{data.wind_speed} km/h</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{data.visibility} km vis.</span>
            </div>
          </div>
          {/* Weather impact on logistics */}
          {(data.main === "Thunderstorm" || data.wind_speed > 60) && (
            <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1 text-[10px] text-destructive">
              ⚠️ Severe conditions — expect delays
            </div>
          )}
          {(data.main === "Rain" || data.main === "Snow") && (
            <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] text-warning">
              🌧️ Adverse weather — monitor route
            </div>
          )}
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground">Weather unavailable</p>
      )}
    </div>
  );
}

export function WeatherWidget({ source, destination }: WeatherWidgetProps) {
  const [srcWeather, setSrcWeather] = useState<WeatherData | null>(null);
  const [dstWeather, setDstWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<string>("");

  const fetchKey = `${source}|${destination}`;

  useEffect(() => {
    if (fetchKey === lastFetch) return;
    setLoading(true);
    setLastFetch(fetchKey);
    Promise.all([fetchWeather(source), fetchWeather(destination)]).then(([s, d]) => {
      setSrcWeather(s);
      setDstWeather(d);
      setLoading(false);
    });
  }, [source, destination, fetchKey, lastFetch]);

  // Overall weather severity for the route
  const hasSevere = [srcWeather, dstWeather].some(
    (w) => w && (w.main === "Thunderstorm" || w.wind_speed > 60),
  );
  const hasAdverse = [srcWeather, dstWeather].some(
    (w) => w && (w.main === "Rain" || w.main === "Snow" || w.main === "Drizzle"),
  );

  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Live Weather
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {hasSevere && (
            <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-destructive">
              Severe
            </span>
          )}
          {!hasSevere && hasAdverse && (
            <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-warning">
              Adverse
            </span>
          )}
          {!hasSevere && !hasAdverse && !loading && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary">
              Clear
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">Live</span>
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      </div>

      <div className="flex gap-3">
        <WeatherCard city={source} data={srcWeather} loading={loading} />
        <div className="flex items-center text-muted-foreground/40 text-lg">→</div>
        <WeatherCard city={destination} data={dstWeather} loading={loading} />
      </div>

      {!loading && (hasSevere || hasAdverse) && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Weather conditions may affect ETA. Use <span className="text-primary font-medium">AI Optimize</span> to find the best mode under current conditions.
        </p>
      )}
    </div>
  );
}
