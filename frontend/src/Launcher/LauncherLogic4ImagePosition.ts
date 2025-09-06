// File: src/Launcher/LauncherLogic4ImagePosition.ts
// Rumah 4: Position & Scale (Logic-2). Pure.

import type { Bus, FrameCtx, LayerConfig, Point } from "./LauncherHubTypes";
import { roundBy, clamp, isFiniteNumber } from "./LauncherUtilMath";

function pickCenterPx(l2: LayerConfig["l2"] | undefined, ctx: FrameCtx): Point {
  const { origin, units } = ctx;
  let cx = origin.centerX;
  let cy = origin.centerY;

  if (l2 && l2.enabled) {
    const { centerMode = "pct100", center = { xPct: 50, yPct: 50 } } = l2;
    if (centerMode === "extendedPct") {
      const p = units.screenExtendedPctToPx(center.xPct, center.yPct, origin);
      cx = p.x; cy = p.y;
    } else {
      const p = units.screenPct100ToPx(center.xPct, center.yPct, origin);
      cx = p.x; cy = p.y;
    }
  }
  return { x: cx, y: cy };
}

function clampCenterIfNeeded(pt: Point, l2: LayerConfig["l2"] | undefined, ctx: FrameCtx): Point {
  const { origin } = ctx;
  if (!l2 || !l2.enabled || l2.clampMode !== "bounds") return pt;

  const m = Math.max(0, Math.min(50, (l2.marginPct ?? 0)));
  const minX = (m / 100) * origin.width;
  const maxX = origin.width - minX;
  const minY = (m / 100) * origin.height;
  const maxY = origin.height - minY;

  return { x: clamp(pt.x, minX, maxX), y: clamp(pt.y, minY, maxY) };
}

function pickScalePx(l2: LayerConfig["l2"] | undefined, ctx: FrameCtx): number {
  const { origin, units } = ctx;
  let scalePct = 100;

  if (l2 && l2.enabled) {
    const s = isFiniteNumber(l2.scalePct) ? (l2.scalePct as number) : 100;
    const sMin = isFiniteNumber(l2.minScalePct) ? (l2.minScalePct as number) : 10;
    const sMax = isFiniteNumber(l2.maxScalePct) ? (l2.maxScalePct as number) : 400;
    const lo = Math.min(sMin, sMax);
    const hi = Math.max(sMin, sMax);
    scalePct = Math.min(hi, Math.max(lo, s));
  }

  return units.vminPctToPx(scalePct, origin);
}

export function logic4ImagePosition(prev: Bus | undefined, ctx: FrameCtx): Bus {
  const layerCfg = prev?.layer?.cfg;
  const l2 = layerCfg?.l2;

  let center = pickCenterPx(l2, ctx);
  center = clampCenterIfNeeded(center, l2, ctx);
  let scalePx = pickScalePx(l2, ctx);

  const rounding = l2?.rounding ?? "round";
  const centerRounded = { x: roundBy(rounding, center.x), y: roundBy(rounding, center.y) };
  scalePx = roundBy(rounding, scalePx);

  const bus: Bus = { ...(prev ?? {}), pos: { centerPx: centerRounded, scalePx } };
  return bus;
}
