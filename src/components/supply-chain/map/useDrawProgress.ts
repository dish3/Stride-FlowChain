import { useEffect, useRef, useState } from "react";

const ANIM_MS = 1500;
const VEHICLE_LOOP_MS = 3500;
const VEHICLE_DELAY_MS = 250; // wait after route finishes drawing

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useDrawProgress(key: string) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ANIM_MS);
      setProgress(easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [key]);

  return progress;
}

/**
 * Continuous 0→1 progress for the vehicle that travels along the polyline.
 * Starts after the line finishes drawing and loops forever.
 * Returns 0 until drawProgress reaches 1.
 */
export function useVehicleProgress(key: string, drawProgress: number, loopMs = 3500) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const ready = drawProgress >= 1;

  useEffect(() => {
    if (!ready) {
      setProgress(0);
      return;
    }
    const start = performance.now() + VEHICLE_DELAY_MS;
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - start);
      const t = (elapsed % loopMs) / loopMs;
      setProgress(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [key, ready, loopMs]);

  return progress;
}

/** Bearing in degrees (0 = north, 90 = east) from point A to B. */
export function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

export function vehicleEmoji(transport?: string) {
  if (!transport) return "🚛";
  if (transport.includes("Air"))   return "✈️";
  if (transport.includes("Ship"))  return "🚢";
  if (transport.includes("Train")) return "🚆";
  return "🚛";
}

/** Returns true when the transport is a ship. */
export function isShipTransport(transport?: string) {
  return !!transport?.includes("Ship");
}

/** Loop duration in ms — ships are slow, so the animation loop is longer. */
export function vehicleLoopMs(transport?: string) {
  if (transport?.includes("Ship")) return 8000;  // slow ocean crossing
  if (transport?.includes("Air"))  return 2500;  // fast
  return 4000;                                    // truck / train
}
