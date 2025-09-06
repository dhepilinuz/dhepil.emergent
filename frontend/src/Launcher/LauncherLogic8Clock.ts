// File: src/Launcher/LauncherLogic8Clock.ts
// Rumah 8: Clock/Timezone. Hasilkan sudut derajat berdasarkan waktu.
// role: "hour" | "minute" | "second"; sync: "device" | "utc" (+utcOffsetMinutes)

import type { Bus, FrameCtx, LayerConfig } from "./LauncherHubTypes";
import { norm360 } from "./LauncherUtilMath";

function timeForConfig(nowMs: number, cfg: NonNullable<LayerConfig["clock"]>): Date {
  // Device: pakai nowMs langsung (zona OS)
  if (cfg.sync !== "utc") return new Date(nowMs);

  // UTC basis, lalu offset manual menit
  const local = new Date(nowMs);
  const utcMs = local.getTime() + local.getTimezoneOffset() * 60000;
  const off = (cfg.utcOffsetMinutes ?? 0) * 60000;
  return new Date(utcMs + off);
}

function angleHourDeg(d: Date, hourStyle: 12 | 24): number {
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const ms = d.getMilliseconds();
  if (hourStyle === 24) {
    const hh = h + m / 60 + s / 3600 + ms / 3600000;
    return (hh / 24) * 360; // full circle = 24 jam
  } else {
    const hh = (h % 12) + m / 60 + s / 3600 + ms / 3600000;
    return hh * 30; // 360/12
  }
}

function angleMinuteDeg(d: Date): number {
  const m = d.getMinutes();
  const s = d.getSeconds();
  const ms = d.getMilliseconds();
  return (m + s / 60 + ms / 60000) * 6; // 360/60
}

function angleSecondDeg(d: Date, mode: "smooth" | "tick"): number {
  const s = d.getSeconds();
  const ms = d.getMilliseconds();
  return mode === "tick" ? s * 6 : (s + ms / 1000) * 6;
}

export function logic8Clock(prev: Bus | undefined, ctx: FrameCtx): Bus {
  const cfg = prev?.layer?.cfg?.clock;
  if (!cfg || !cfg.enabled) {
    return { ...(prev ?? {}), clock: { deg: 0 } };
  }

  const d = timeForConfig(ctx.nowMs, cfg);
  const role = cfg.role ?? "minute";
  const hourStyle = cfg.hourStyle === 24 ? 24 : 12;
  const secondMode = role === "second" && cfg.secondMode === "tick" ? "tick" : "smooth";

  let deg = 0;
  if (role === "hour") deg = angleHourDeg(d, hourStyle);
  else if (role === "second") deg = angleSecondDeg(d, secondMode);
  else deg = angleMinuteDeg(d);

  const offset = typeof cfg.offsetDeg === "number" ? cfg.offsetDeg : 0;

  return { ...(prev ?? {}), clock: { deg: norm360(deg + offset) } };
}
