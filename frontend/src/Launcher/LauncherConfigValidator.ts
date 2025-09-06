// File: src/Launcher/LauncherConfigValidator.ts
// Validator schema v2 tanpa `any`. Semua input ditangani sebagai `unknown` lalu di-clamp.
// Output kompatibel dengan tipe di LauncherConfigSchema.ts

import type {
  LauncherConfigRoot,
  BgLayer,
  LayerConfig,
  Logic2Config,
  Logic2AConfig,
  SpinConfig,
  OrbitConfig,
  ClockConfig,
  EffectConfig,
} from "./LauncherConfigSchema";
import { SCHEMA_VERSION } from "./LauncherConfigSchema";

/* =========================
   Helpers tipe & clamp
   ========================= */
type Dict = Record<string, unknown>;
const isObj = (v: unknown): v is Dict => !!v && typeof v === "object" && !Array.isArray(v);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d = false) => (typeof v === "boolean" ? v : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

function pickEnum<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  const s = str(v, d) as T;
  return (allowed as readonly string[]).includes(s) ? s : d;
}

function pct(v: unknown, d = 0, lo = 0, hi = 100) {
  return clamp(num(v, d), lo, hi);
}

function pointPct100(v: unknown, dX = 50, dY = 50) {
  const o = isObj(v) ? v : {};
  return { xPct: pct(o["xPct"], dX, 0, 100), yPct: pct(o["yPct"], dY, 0, 100) };
}

function pointExtPct(v: unknown, dX = 0, dY = 0) {
  const o = isObj(v) ? v : {};
  return { xPct: clamp(num(o["xPct"], dX), -200, 200), yPct: clamp(num(o["yPct"], dY), -200, 200) };
}

/* =========================
   Background
   ========================= */
function validateBackground(x: unknown): BgLayer {
  const b = isObj(x) ? x : {};
  const fit = (() => {
    const v = str(b["fit"], "contain");
    return v === "contain" || v === "cover" || v === "fill" || v === "none" ? v : "contain";
  })();

  return {
    id: str(b["id"], "BG"),
    src: str(b["src"], ""),
    xPct: pct(b["xPct"], 50),
    yPct: pct(b["yPct"], 50),
    scalePct: pct(b["scalePct"], 100, 1, 400),
    opacityPct: pct(b["opacityPct"], 100, 0, 100),
    z: num(b["z"], 0),
    fit,
  };
}

/* =========================
   Block: L2
   ========================= */
function validateL2(x: unknown): Logic2Config {
  const o = isObj(x) ? x : {};
  const clampMode = pickEnum(o["clampMode"], ["none", "bounds"] as const, "none");
  const centerMode = pickEnum(o["centerMode"], ["pct100", "extendedPct"] as const, "pct100");

  return {
    enabled: bool(o["enabled"], false),
    clampMode,
    centerMode,
    center:
      centerMode === "pct100"
        ? pointPct100(o["center"], 50, 50)
        : pointExtPct(o["center"], 0, 0),
    scalePct: pct(o["scalePct"], 100, 1, 400),
    minScalePct: pct(o["minScalePct"], 1, 1, 400),
    maxScalePct: pct(o["maxScalePct"], 400, 1, 400),
    marginPct: pct(o["marginPct"], 5, 0, 50),
    rounding: pickEnum(o["rounding"], ["round", "floor", "ceil"] as const, "round"),
  };
}

/* =========================
   Block: L2A
   ========================= */
function validateL2A(x: unknown): Logic2AConfig {
  const o = isObj(x) ? x : {};
  return {
    enabled: bool(o["enabled"], false),
    rotationMode: "anchored",
    base: pointExtPct(o["base"], 0, 50),
    tip: pointExtPct(o["tip"], 0, -50),
    pivot: pickEnum(o["pivot"], ["center", "base"] as const, "center"),
    align: pickEnum(o["align"], ["vertical", "axis"] as const, "vertical"),
  };
}

/* =========================
   Block: Spin (Logic-3)
   ========================= */
function validateSpin(x: unknown): SpinConfig {
  const o = isObj(x) ? x : {};
  return {
    enabled: bool(o["enabled"], false),
    rpm: clamp(num(o["rpm"], num(o["fullSpinPerMinute"], 0)), 0, 120),
    direction: pickEnum(o["direction"], ["cw", "ccw"] as const, "cw"),
    maxFps: clamp(num(o["maxFps"], 60), 15, 60),
    easing: pickEnum(o["easing"], ["linear", "thick", "smooth"] as const, "linear"),
    pivotSource: pickEnum(o["pivotSource"], ["logic2-center", "logic2A-base"] as const, "logic2-center"),
  };
}

/* =========================
   Block: Orbit (Logic-3A)
   ========================= */
function validateOrbit(x: unknown): OrbitConfig {
  const o = isObj(x) ? x : {};

  // orbitPoint
  const opRaw = o["orbitPoint"];
  const orbitPoint =
    opRaw === "dotmark"
      ? "dotmark"
      : isObj(opRaw)
      ? pointPct100(opRaw, 50, 50)
      : "dotmark";

  // line
  const lineRaw = o["line"] ?? o["orbitLineSource"];
  let line: OrbitConfig["line"] = "none";
  if (typeof lineRaw === "string") {
    const v = lineRaw as string;
    line = v === "none" || v === "center" || v === "base" || v === "tip" ? (v as any) : "none";
  } else if (isObj(lineRaw)) {
    line = pointPct100(lineRaw, 50, 50);
  }

  // startPhase
  const spRaw = o["startPhase"];
  const startPhase = typeof spRaw === "number" ? spRaw : "auto";

  return {
    enabled: bool(o["enabled"], false),
    rpm: clamp(num(o["rpm"], num(o["fullOrbitPerMinute"], 0)), 0, 60),
    direction: pickEnum(o["direction"], ["cw", "ccw"] as const, "cw"),
    radiusPct: pct(o["radiusPct"], 0, 0, 100),
    orbitPoint,
    line,
    startPhase,
    maxFps: clamp(num(o["maxFps"], 60), 15, 60),
    showLine: bool(o["showLine"], false),
  };
}

/* =========================
   Block: Clock
   ========================= */
function validateClock(x: unknown): ClockConfig {
  const o = isObj(x) ? x : {};
  const sync = pickEnum(o["sync"], ["device", "utc"] as const, "device");
  const role = pickEnum(o["role"], ["hour", "minute", "second"] as const, "minute");
  const secondMode = pickEnum(o["secondMode"], ["smooth", "tick"] as const, "smooth");
  const hourStyle = ((): 12 | 24 => {
    const n = num(o["hourStyle"], 12);
    return n === 24 ? 24 : 12;
  })();

  return {
    enabled: bool(o["enabled"], false),
    sync,
    utcOffsetMinutes: sync === "utc" ? num(o["utcOffsetMinutes"], 0) : undefined,
    role,
    secondMode,
    hourStyle,
    offsetDeg: clamp(num(o["offsetDeg"], 0), -180, 180),
  };
}

/* =========================
   Block: Effect
   ========================= */
function validateEffect(x: unknown): EffectConfig {
  const o = isObj(x) ? x : {};
  const visibility = pickEnum(o["visibility"], ["visible", "hidden"] as const, "visible");
  const blend = pickEnum(
    o["blend"],
    [
      "normal",
      "multiply",
      "screen",
      "overlay",
      "darken",
      "lighten",
      "color-dodge",
      "color-burn",
      "difference",
      "exclusion",
      "hue",
      "saturation",
      "color",
      "luminosity",
    ] as const,
    "normal"
  );

  return {
    enabled: bool(o["enabled"], false),
    visibility,
    opacityPct: pct(o["opacityPct"], 100, 0, 100),
    blend,
    blurPx: clamp(num(o["blurPx"], 0), 0, 100),
    brightnessPct: pct(o["brightnessPct"], 100, 0, 200),
    contrastPct: pct(o["contrastPct"], 100, 0, 200),
    saturatePct: pct(o["saturatePct"], 100, 0, 200),
    grayscalePct: pct(o["grayscalePct"], 0, 0, 100),
    hueRotateDeg: clamp(num(o["hueRotateDeg"], 0), -180, 180),
  };
}

/* =========================
   Layer
   ========================= */
function validateLayer(x: unknown): LayerConfig {
  const o = isObj(x) ? x : {};
  const l2 = validateL2(o["l2"]);
  const l2a = validateL2A(o["l2a"]);
  const spin = validateSpin(o["spin"]);
  const orbit = validateOrbit(o["orbit"]);
  const clock = validateClock(o["clock"]);
  const effect = validateEffect(o["effect"]);

  return {
    id: str(o["id"], "layer"),
    path: str(o["path"], ""),
    enabled: bool(o["enabled"], true),
    zHint: num(o["zHint"], 0),
    l2,
    l2a,
    spin,
    orbit,
    clock,
    effect,
  };
}

/* =========================
   Root
   ========================= */
export function validateConfig(input: unknown): LauncherConfigRoot {
  const o = isObj(input) ? input : {};
  const backgrounds = Array.isArray(o["backgrounds"]) ? (o["backgrounds"] as unknown[]).map(validateBackground) : [];
  const layers = Array.isArray(o["layers"]) ? (o["layers"] as unknown[]).map(validateLayer) : [];

  return {
    schemaVersion: str(o["schemaVersion"], SCHEMA_VERSION),
    meta: isObj(o["meta"]) ? { app: str(o["meta"]!["app"], "Launcher"), build: str(o["meta"]!["build"], new Date().toISOString()) } : { app: "Launcher", build: new Date().toISOString() },
    backgrounds,
    layers,
    defaults: isObj(o["defaults"]) ? (o["defaults"] as Dict) : {},
  };
}
