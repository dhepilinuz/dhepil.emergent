// File: src/Launcher/LauncherConfigValidator.ts
// Validasi & sanitasi config: tahan banting untuk null/undefined/tipe salah.
// Semua blok optional di-fallback ke default aman tanpa bikin pipeline macet.

import {
  LauncherConfigRoot,
  LayerConfig,
  L2Config,
  L2AConfig,
  SpinConfig,
  OrbitConfig,
  ClockConfig,
  BgLayer,
  EffectConfig,
} from "./LauncherConfigSchema";
import { DEFAULT_MAX_FPS, MIN_FPS } from "./LauncherHubTypes";
import { DEFAULTS, DefaultL2, DefaultL2A, DefaultSpin, DefaultOrbit } from "./LauncherConfigDefaults";
import { clamp, isFiniteNumber } from "./LauncherUtilMath";

/* =========================
   Small helpers (null-safe)
   ========================= */
const isObj = (v: any): v is Record<string, any> => v != null && typeof v === "object" && !Array.isArray(v);
const numOr = (v: any, fb: number) => (isFiniteNumber(v) ? (v as number) : fb);
const boolOr = (v: any, fb: boolean) => (typeof v === "boolean" ? v : fb);
const strOr = (v: any, fb: string) => (typeof v === "string" ? v : fb);

const clampPct100 = (v: number) => clamp(v, 0, 100);
const clampPct200 = (v: number) => clamp(v, -200, 200);
const clampPosPct = (v: number) => clamp(v, 1, 400);
const clampOpacity = (v: number) => clamp(v, 0, 100);
const clampZ = (v: number) => clamp(v, 0, 100);
const clampZBg = (v: number) => clamp(v, 0, 10);
const clampFps = (v: number) => clamp(Math.round(v), MIN_FPS, DEFAULT_MAX_FPS);

/* =========================
   Backgrounds
   ========================= */
function validateBackground(x: any): BgLayer {
  const b = isObj(x) ? x : {};
  const fit = b.fit === "cover" || b.fit === "fill" || b.fit === "none" ? b.fit : "contain";
  return {
    id: strOr(b.id, "BG"),
    src: strOr(b.src, ""),
    xPct: clampPct100(numOr(b.xPct, 50)),
    yPct: clampPct100(numOr(b.yPct, 50)),
    scalePct: clampPosPct(numOr(b.scalePct, 100)),
    opacityPct: clampOpacity(numOr(b.opacityPct, 100)),
    z: clampZBg(numOr(b.z, 0)),
    fit,
  };
}

/* =========================
   Logic blocks
   ========================= */
function validateL2(x: any): L2Config {
  const l = isObj(x) ? x : {};
  const centerMode: L2Config["centerMode"] = l.centerMode === "extendedPct" ? "extendedPct" : "pct100";
  const c = isObj(l.center) ? l.center : {};
  const center =
    centerMode === "extendedPct"
      ? { xPct: clampPct200(numOr(c.xPct, 0)), yPct: clampPct200(numOr(c.yPct, 0)) }
      : { xPct: clampPct100(numOr(c.xPct, 50)), yPct: clampPct100(numOr(c.yPct, 50)) };

  const clampMode: L2Config["clampMode"] = l.clampMode === "bounds" ? "bounds" : "none";

  const v: L2Config = {
    enabled: boolOr(l.enabled, DefaultL2.enabled),
    clampMode,
    centerMode,
    center,
    scalePct: clampPosPct(numOr(l.scalePct, DefaultL2.scalePct)),
    minScalePct: clampPosPct(numOr(l.minScalePct, DefaultL2.minScalePct)),
    maxScalePct: clampPosPct(numOr(l.maxScalePct, DefaultL2.maxScalePct)),
    marginPct: clampPct100(numOr(l.marginPct, DefaultL2.marginPct)),
    rounding: l.rounding === "floor" || l.rounding === "ceil" ? l.rounding : "round",
  };
  if (v.minScalePct > v.maxScalePct) {
    const t = v.minScalePct;
    v.minScalePct = v.maxScalePct;
    v.maxScalePct = t;
    console.warn("[cfg] l2.minScalePct > maxScalePct; swapped.");
  }
  return v;
}

function validateL2A(x: any | undefined): L2AConfig | undefined {
  if (!x) return undefined;
  const l = isObj(x) ? x : {};
  const base = isObj(l.base) ? l.base : {};
  const tip = isObj(l.tip) ? l.tip : {};
  const pivot: L2AConfig["pivot"] = l.pivot === "base" ? "base" : "center";
  const align: L2AConfig["align"] = l.align === "axis" ? "axis" : "vertical";
  return {
    enabled: boolOr(l.enabled, false),
    rotationMode: "anchored",
    base: { xPct: clampPct200(numOr(base.xPct, DefaultL2A.base.xPct)), yPct: clampPct200(numOr(base.yPct, DefaultL2A.base.yPct)) },
    tip: { xPct: clampPct200(numOr(tip.xPct, DefaultL2A.tip.xPct)), yPct: clampPct200(numOr(tip.yPct, DefaultL2A.tip.yPct)) },
    pivot,
    align,
  };
}

function validateSpin(x: any | undefined): SpinConfig | undefined {
  if (!x) return undefined;
  const s = isObj(x) ? x : {};
  const pivotSource: SpinConfig["pivotSource"] =
    s.pivotSource === "logic2A-base" ? "logic2A-base" : "logic2-center";
  return {
    enabled: boolOr(s.enabled, false),
    rpm: Math.max(0, numOr(s.rpm, DefaultSpin.rpm)),
    direction: s.direction === "ccw" ? "ccw" : "cw",
    maxFps: clampFps(numOr(s.maxFps, DefaultSpin.maxFps)),
    easing: "linear",
    pivotSource,
  };
}

function validateOrbit(x: any | undefined): OrbitConfig | undefined {
  if (!x) return undefined;
  const o = isObj(x) ? x : {};

  // orbitPoint
  let orbitPoint: OrbitConfig["orbitPoint"] = "dotmark";
  if (o.orbitPoint === "dotmark") orbitPoint = "dotmark";
  else if (isObj(o.orbitPoint) && isFiniteNumber(o.orbitPoint.xPct) && isFiniteNumber(o.orbitPoint.yPct)) {
    orbitPoint = { xPct: clampPct100(o.orbitPoint.xPct), yPct: clampPct100(o.orbitPoint.yPct) };
  }

  // line
  let line: OrbitConfig["line"] = "none";
  if (o.line === "none" || o.line === "center" || o.line === "base" || o.line === "tip") {
    line = o.line;
  } else if (isObj(o.line) && isFiniteNumber(o.line.xPct) && isFiniteNumber(o.line.yPct)) {
    line = { xPct: clampPct100(o.line.xPct), yPct: clampPct100(o.line.yPct) };
  }

  const startPhase: OrbitConfig["startPhase"] =
    o.startPhase === "auto" || !isFiniteNumber(o.startPhase) ? "auto" : ((o.startPhase as number) % 360);

  return {
    enabled: boolOr(o.enabled, false),
    rpm: Math.max(0, numOr(o.rpm, DefaultOrbit.rpm)),
    direction: o.direction === "ccw" ? "ccw" : "cw",
    radiusPct: Math.max(0, numOr(o.radiusPct, DefaultOrbit.radiusPct)),
    orbitPoint,
    line,
    startPhase,
    maxFps: clampFps(numOr(o.maxFps, DefaultOrbit.maxFps)),
    showLine: boolOr(o.showLine, false),
  };
}

function validateClock(x: any | undefined): ClockConfig | undefined {
  if (!x) return undefined;
  const c = isObj(x) ? x : {};
  const sync: ClockConfig["sync"] = c.sync === "utc" ? "utc" : "device";
  let utc: number | undefined = undefined;
  if (sync === "utc") {
    utc = isFiniteNumber(c.utcOffsetMinutes) ? (c.utcOffsetMinutes as number) : 0;
    if (!isFiniteNumber(c.utcOffsetMinutes)) {
      console.warn("[cfg] clock.sync='utc' but utcOffsetMinutes missing. Fallback 0.");
    }
  }
  const role: ClockConfig["role"] = c.role === "hour" || c.role === "second" ? c.role : "minute";
  const secondMode: ClockConfig["secondMode"] = role === "second" && c.secondMode === "tick" ? "tick" : "smooth";
  const hourStyle: ClockConfig["hourStyle"] = c.hourStyle === 24 ? 24 : 12;
  const offsetDeg = clamp(numOr(c.offsetDeg, 0), -180, 180);

  return {
    enabled: boolOr(c.enabled, false),
    sync,
    utcOffsetMinutes: utc,
    role,
    secondMode,
    hourStyle,
    offsetDeg,
  };
}

function validateEffect(x: any | undefined): EffectConfig | undefined {
  if (!x) return undefined;
  const e = isObj(x) ? x : {};
  const visibility: EffectConfig["visibility"] = e.visibility === "hidden" ? "hidden" : "visible";
  const blend = strOr(e.blend, "normal") as EffectConfig["blend"];
  return {
    enabled: boolOr(e.enabled, false),
    visibility,
    opacityPct: clampOpacity(numOr(e.opacityPct, 100)),
    blend,
    blurPx: Math.max(0, numOr(e.blurPx, 0)),
    brightnessPct: clampPct100(numOr(e.brightnessPct, 100)),
    contrastPct: clampPct100(numOr(e.contrastPct, 100)),
    saturatePct: clampPct100(numOr(e.saturatePct, 100)),
    grayscalePct: clampPct100(numOr(e.grayscalePct, 0)),
    hueRotateDeg: clamp(numOr(e.hueRotateDeg, 0), 0, 360),
  };
}

/* =========================
   Layer wrapper
   ========================= */
function validateLayer(raw: any, index: number): LayerConfig {
  const r = isObj(raw) ? raw : {};
  const id = strOr(r.id, `layer-${index}`);
  const path = strOr(r.path, "");
  const enabled = !!path && boolOr(r.enabled, true);
  const zHint = clampZ(numOr(r.zHint, 0));

  const l2 = validateL2(r.l2 ?? DefaultL2);
  const l2a = validateL2A(r.l2a);
  const spin = validateSpin(r.spin);
  const orbit = validateOrbit(r.orbit);
  const clock = validateClock(r.clock);
  const effect = validateEffect(r.effect);

  if ((spin?.enabled || orbit?.enabled || clock?.enabled) && l2.clampMode !== "none") {
    console.warn(`[cfg] Layer "${id}": animations enabled but l2.clampMode != "none" (potensi jitter).`);
  }

  return { id, path, enabled, zHint, l2, l2a, spin, orbit, clock, effect };
}

/* =========================
   Entry point
   ========================= */
export function validateConfig(root: any): LauncherConfigRoot {
  const schemaVersion = strOr(root?.schemaVersion, "2.0.0");
  const meta = isObj(root?.meta) ? root.meta : {};
  const backgroundsRaw = Array.isArray(root?.backgrounds) ? root.backgrounds : [];
  const layersRaw = Array.isArray(root?.layers) ? root.layers : [];

  const backgrounds = backgroundsRaw.map(validateBackground);

  // de-duplicate layer ids (soft)
  const seen = new Set<string>();
  const layers = layersRaw.map((l: any, i: number) => {
    let sane = validateLayer(l, i);
    if (seen.has(sane.id)) {
      const newId = `${sane.id}.${i}`;
      console.warn(`[cfg] Duplicate layer id "${sane.id}" → renamed to "${newId}".`);
      sane = { ...sane, id: newId };
    }
    seen.add(sane.id);
    return sane;
  });

  return {
    schemaVersion,
    meta: {
      app: strOr(meta.app, "Launcher"),
      build: strOr(meta.build, new Date().toISOString()),
      author: meta.author ? strOr(meta.author, "") : undefined,
    },
    backgrounds,
    layers,
    defaults: root?.defaults ? { ...DEFAULTS, ...root.defaults } : DEFAULTS,
  };
}
