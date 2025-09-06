// File: src/Launcher/LauncherLogic7Orbit.ts
// Rumah 7: Orbit (Logic-3A). Pure.

import type { Bus, FrameCtx, LayerConfig, OrbitToken, Point } from "./LauncherHubTypes";
import { ORBIT_EPS } from "./LauncherHubTypes";
import { norm360, toDeg, dist, polarToCartesian, clamp } from "./LauncherUtilMath";

/* ==============================
   Sudut orbit dari rpm & token
   ============================== */
function rpmToDegPerMs(rpm: number, dir: "cw" | "ccw"): number {
  const sign = dir === "ccw" ? -1 : 1;
  return sign * (rpm * 360) / 60000;
}

export function orbitAngleDeg(nowMs: number, cfg: LayerConfig["orbit"] | undefined, token: OrbitToken | null | undefined): number {
  if (!cfg || !cfg.enabled) return 0;
  const rpm = Math.max(0, cfg.rpm || 0);
  if (rpm <= 0) return 0;
  if (!token) return 0;

  const dpsMs = rpmToDegPerMs(rpm, cfg.direction || "cw");
  const dt = Math.max(0, nowMs - token.t0Ms);
  return norm360(token.theta0Deg + dpsMs * dt);
}

/* ==============================
   Resolver titik green/blue
   ============================== */
export function resolveGreenPx(orbt: NonNullable<LayerConfig["orbit"]>, ctx: FrameCtx): Point {
  const { origin, units } = ctx;
  const op = orbt.orbitPoint;
  if (op === "dotmark") return { x: origin.centerX, y: origin.centerY };
  const p = units.screenPct100ToPx(clamp(op.xPct, 0, 100), clamp(op.yPct, 0, 100), origin);
  return { x: p.x, y: p.y };
}

export function resolveBluePx(orbt: NonNullable<LayerConfig["orbit"]>, ctx: FrameCtx, bus: Bus): Point | null {
  const { origin, units } = ctx;
  const ln = orbt.line;
  if (ln === "none") return null;
  if (ln === "center") {
    const c = bus.pos?.centerPx;
    return c ? { x: c.x, y: c.y } : null;
  }
  if (ln === "base") {
    const b = bus.angle?.basePx;
    return b ? { x: b.x, y: b.y } : null;
  }
  if (ln === "tip") {
    const t = bus.angle?.tipPx;
    return t ? { x: t.x, y: t.y } : null;
  }
  const p = units.screenPct100ToPx(clamp(ln.xPct, 0, 100), clamp(ln.yPct, 0, 100), origin);
  return { x: p.x, y: p.y };
}

export function isInsideViewport(pt: Point | null | undefined, origin: FrameCtx["origin"]): boolean {
  if (!pt) return false;
  return pt.x >= 0 && pt.x <= origin.width && pt.y >= 0 && pt.y <= origin.height;
}

/* ==============================
   Derive OrbitToken inputs
   ============================== */
export function deriveOrbitInitParams(
  ctx: FrameCtx,
  bus: Bus,
  orbt: NonNullable<LayerConfig["orbit"]>
): { rPx: number; theta0Deg: number; validBlue: boolean } {
  const green = resolveGreenPx(orbt, ctx);
  const blue = resolveBluePx(orbt, ctx, bus);

  if (blue && isInsideViewport(blue, ctx.origin)) {
    const r = dist(green.x, green.y, blue.x, blue.y);
    if (r > ORBIT_EPS) {
      const theta0Deg = norm360(toDeg(Math.atan2(blue.y - green.y, blue.x - green.x)));
      return { rPx: r, theta0Deg, validBlue: true };
    }
  }

  const rPx = Math.max(0, ctx.units.vminPctToPx(Math.max(0, orbt.radiusPct || 0), ctx.origin));
  const theta0Deg = typeof orbt.startPhase === "number" ? norm360(orbt.startPhase) : 0;
  return { rPx, theta0Deg, validBlue: false };
}

/* ==============================
   Token factory
   ============================== */
export function makeOrbitToken(nowMs: number, rPx: number, theta0Deg: number, validBlue: boolean): OrbitToken {
  return { rPx: Math.max(0, rPx), theta0Deg: norm360(theta0Deg), t0Ms: nowMs, validBlue: !!validBlue };
}

export function shouldRebaseOrbit(prevCfg?: LayerConfig["orbit"], nextCfg?: LayerConfig["orbit"]): boolean {
  const p = prevCfg, n = nextCfg;
  if (!!(p?.enabled) !== !!(n?.enabled)) return true;
  if ((p?.rpm || 0) !== (n?.rpm || 0)) return true;
  if ((p?.direction || "cw") !== (n?.direction || "cw")) return true;
  if ((p?.radiusPct || 0) !== (n?.radiusPct || 0)) return true;
  if (JSON.stringify(p?.orbitPoint) !== JSON.stringify(n?.orbitPoint)) return true;
  if (JSON.stringify(p?.line) !== JSON.stringify(n?.line)) return true;
  if ((p?.startPhase ?? "auto") !== (n?.startPhase ?? "auto")) return true;
  return false;
}

/* ==============================
   Eksekutor Rumah-7
   ============================== */
export function logic7Orbit(prev: Bus | undefined, ctx: FrameCtx, token: OrbitToken | null | undefined): Bus {
  const cfg = prev?.layer?.cfg?.orbit;
  if (!cfg || !cfg.enabled || !token || token.rPx <= 0) {
    return { ...(prev ?? {}), orbit: { dx: 0, dy: 0 } };
  }

  const theta = orbitAngleDeg(ctx.nowMs, cfg, token);
  const { x, y } = polarToCartesian(token.rPx, theta); // 0°=kanan, 90°=bawah
  const bus: Bus = { ...(prev ?? {}), orbit: { dx: x, dy: y } };
  return bus;
}
