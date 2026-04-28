import { Request, Response } from "express";


// We import the shared logic here. Since it's in a shared folder, we can use relative paths or typescript aliases if configured.
import { COST_PER_KM, CO2_PER_KM, SPEED, CITIES, type RouteResult } from "../../shared/supply-chain.js";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

interface GeminiChatInput {
  message: string;
  history: ChatMessage[];
  route: RouteResult | null;
}

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
}

interface WeatherSnapshot {
  city: string;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed_kmh: number;
  visibility_km: number;
  description: string;
  main: string;
}

function decodeWMO(code: number): { main: string; description: string } {
  if (code === 0) return { main: "Clear", description: "clear sky" };
  if (code <= 3) return { main: "Clouds", description: code === 1 ? "mainly clear" : code === 2 ? "partly cloudy" : "overcast" };
  if (code <= 49) return { main: "Fog", description: "fog" };
  if (code <= 59) return { main: "Drizzle", description: "drizzle" };
  if (code <= 69) return { main: "Rain", description: code <= 63 ? "light rain" : "heavy rain" };
  if (code <= 79) return { main: "Snow", description: "snow" };
  if (code <= 82) return { main: "Rain", description: "rain showers" };
  if (code <= 86) return { main: "Snow", description: "snow showers" };
  if (code === 95) return { main: "Thunderstorm", description: "thunderstorm" };
  if (code >= 96) return { main: "Thunderstorm", description: "thunderstorm with hail" };
  return { main: "Clear", description: "clear" };
}

async function fetchWeatherForCity(cityName: string): Promise<WeatherSnapshot | null> {
  const city = CITIES[cityName];
  if (!city) return null;
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility&timezone=auto`,
    );
    if (!res.ok) return null;
    const d = await res.json() as any;
    const current = d.current;
    const { main, description } = decodeWMO(current.weather_code ?? 0);
    return {
      city: cityName,
      temp: Math.round(current.temperature_2m),
      feels_like: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      wind_speed_kmh: Math.round(current.wind_speed_10m),
      visibility_km: Math.round((current.visibility ?? 10000) / 1000),
      description,
      main,
    };
  } catch {
    return null;
  }
}

function formatWeather(label: string, w: WeatherSnapshot | null): string {
  if (!w) return `${label}: Weather data unavailable`;
  const severity =
    w.main === "Thunderstorm" || w.wind_speed_kmh > 60
      ? "🔴 SEVERE — expect significant delays"
      : w.main === "Rain" || w.main === "Snow" || w.main === "Drizzle"
        ? "🟡 ADVERSE — monitor route"
        : "🟢 CLEAR — no weather impact";

  return `${label} (${w.city}):
  Condition: ${w.description} (${w.main})
  Temperature: ${w.temp}°C (feels like ${w.feels_like}°C)
  Humidity: ${w.humidity}%
  Wind: ${w.wind_speed_kmh} km/h
  Visibility: ${w.visibility_km} km
  Logistics impact: ${severity}`;
}

function buildSystemPrompt(
  route: RouteResult | null,
  srcWeather: WeatherSnapshot | null,
  dstWeather: WeatherSnapshot | null,
): string {
  const base = `You are **Flo**, the AI logistics co-pilot for FlowChain — an AI-powered global freight planning system.

PERSONALITY:
- Friendly, confident, and concise. Use emoji sparingly but naturally.
- Speak in short paragraphs. Use **bold** for key numbers/modes.
- You are an expert in global supply chain logistics, freight routing, cost analysis, and environmental impact.
- Always reference concrete numbers from the current shipment when available.
- Keep answers focused and under 150 words unless the user asks for detail.
- If someone asks something unrelated to logistics, politely steer back or give a brief answer.
- When asked about weather, ALWAYS use the LIVE WEATHER DATA provided below. This is REAL-TIME data — present it confidently.

CAPABILITIES:
- Explain transport decisions (Air ✈️, Ship 🚢, Train 🚆, Truck 🚛)
- Compare modes by ETA, cost (₹), CO₂ emissions
- Analyze disruptions (traffic, rain, blockage, storm)
- Recommend optimizations
- Report LIVE real-time weather conditions at source and destination cities
- Assess how current weather impacts transport decisions
- Answer general logistics/supply-chain questions

TRANSPORT COSTS PER KM: Air ₹12, Ship ₹1.2, Train ₹4, Truck ₹6
TRANSPORT SPEEDS: Air 800km/h, Ship 35km/h, Train 120km/h, Truck 80km/h
CO₂ PER KM: Air 0.85kg, Ship 0.015kg, Train 0.05kg, Truck 0.18kg`;

  if (!route) {
    const weatherSection =
      srcWeather || dstWeather
        ? `\n\nLIVE WEATHER (real-time from Open-Meteo):\n${srcWeather ? formatWeather("Source", srcWeather) : ""}\n${dstWeather ? formatWeather("Destination", dstWeather) : ""}`
        : "";

    return `${base}${weatherSection}

CURRENT STATE: No shipment is planned yet. Guide the user to fill in the shipment form (source, destination, weight, urgency) and click "Plan Route".`;
  }

  const r = route;
  const srcCity = CITIES[r.source];
  const dstCity = CITIES[r.destination];

  const modes = (["Air ✈️", "Ship 🚢", "Train 🚆", "Truck 🚛"] as const).map((t) => ({
    mode: t,
    eta: +(r.distance / SPEED[t] + (t === "Ship 🚢" ? 48 : 2)).toFixed(1),
    cost: Math.round(r.distance * COST_PER_KM[t]),
    co2: +(r.distance * CO2_PER_KM[t]).toFixed(1),
  }));

  const modeTable = modes
    .map((m) => `  ${m.mode}: ETA ${m.eta}h, Cost ₹${m.cost.toLocaleString()}, CO₂ ${m.co2}kg`)
    .join("\n");

  const weatherLines: string[] = [];
  if (srcWeather) weatherLines.push(formatWeather(`Source — ${r.source}`, srcWeather));
  if (dstWeather) weatherLines.push(formatWeather(`Destination — ${r.destination}`, dstWeather));
  const weatherSection =
    weatherLines.length > 0
      ? `\n\n🌦️ LIVE WEATHER (real-time data from Open-Meteo — this is CURRENT and ACCURATE):\n${weatherLines.join("\n\n")}`
      : "\n\nLIVE WEATHER: Could not fetch weather data at the moment.";

  return `${base}

CURRENT SHIPMENT:
- Route: **${r.source}** (${srcCity?.region ?? "Unknown"}, ${srcCity?.country ?? ""}) → **${r.destination}** (${dstCity?.region ?? "Unknown"}, ${dstCity?.country ?? ""})
- Distance: **${r.distance.toLocaleString()} km**
- Weight: **${r.weight.toLocaleString()} kg**
- Urgency: **${r.urgency}**
- Route type: ${r.oceanRoute ? "**Ocean route** (Train and Truck are impossible)" : "**Land route** (all ground modes viable)"}

CURRENT PLAN:
- Selected transport: **${r.transport}**
- ETA: **${r.eta} h** (base: ${r.baseEta} h${r.eta !== r.baseEta ? `, delay: +${(r.eta - r.baseEta).toFixed(1)}h` : ""})
- Cost: **₹${r.cost.toLocaleString()}** (₹${(r.cost / r.distance).toFixed(1)}/km)
- CO₂: **${r.co2} kg**
- Confidence: **${r.confidence}%**
- Risk: **${r.risk}**
- Disruption: ${r.disruption ? `**${r.disruption}** active` : "None"}
- Traffic level: ${r.trafficLevel}/3
- Rain level: ${r.rainLevel}/3
- Optimized: ${r.optimized ? "Yes" : "No"}
${r.warning ? `- Warning: ${r.warning}` : ""}
${r.suggestion ? `- AI suggestion: ${r.suggestion}` : ""}

ALL MODES COMPARISON:
${modeTable}

AI REASONING:
${r.reasoning?.map((line) => `- ${line}`).join("\n") ?? "N/A"}${weatherSection}`;
}

export const handleGeminiChat = async (req: Request, res: Response) => {
  const data = req.body as GeminiChatInput;
  if (!data.message || typeof data.message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      reply: "⚠️ Gemini API key not configured. Add `GEMINI_API_KEY` to your `.env` file on the server to enable AI chat.",
    });
  }

  try {
    const sourceName = data.route?.source;
    const destName = data.route?.destination;
    const [srcWeather, dstWeather] = await Promise.all([
      sourceName ? fetchWeatherForCity(sourceName) : Promise.resolve(null),
      destName ? fetchWeatherForCity(destName) : Promise.resolve(null),
    ]);

    const contents: GeminiContent[] = data.history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));
    contents.push({ role: "user", parts: [{ text: data.message }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(data.route, srcWeather, dstWeather) }],
          },
          contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 700,
          },
        }),
      },
    );

    const payload = (await response.json()) as GeminiApiResponse;
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message ?? `Gemini request failed with ${response.status}`);
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    return res.json({
      reply: text || "I could not generate a response from Gemini just now. Try asking again in a moment.",
    });
  } catch (error: any) {
    console.error("Gemini API error:", error);

    if (error?.message?.includes("API_KEY_INVALID")) {
      return res.json({ reply: "⚠️ The Gemini API key is invalid. Please check your `.env` file." });
    }
    if (error?.message?.includes("QUOTA")) {
      return res.json({ reply: "⚠️ Gemini API quota exceeded. Please try again later or check your billing." });
    }

    return res.json({
      reply: `I had trouble connecting to Gemini. Error: ${error?.message ?? "Unknown error"}. I can still help with the basics — try asking about **cost**, **ETA**, or **CO₂**!`,
    });
  }
};
