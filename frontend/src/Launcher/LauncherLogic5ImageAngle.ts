// File: src/Launcher/LauncherLogic5ImageAngle.ts
// Rumah 5: Image Angle (Logic-2A). Pure. Urus base/tip & rotation anchored.

import type { Bus, LayerConfig, Point, Size } from "./LauncherHubTypes";
import { norm360, toDeg } from "./LauncherUtilMath";
import { UnitsImpl } from "./LauncherUtilUnits";

// map local pct (-200..200) ke offset px relatif pusat gambar, skala display
function localPctToDisplayOffset(xPct: number, yPct: number, natural: Size, scalePx: number): Point {
  const localPx = UnitsImpl.imgLocalPctToPx(xPct, yPct, natural); // relatif pusat natural
  const s = natural.h > 0 ? scalePx / natural.h : 1;              // skala tinggi
  return { x: localPx.x * s, y: localPx.y * s };
}

function angleOfBaseToTip(baseOff: Point, tipOff: Point): number {
  const vx = tipOff.x - baseOff.x;
  const vy = tipOff.y - baseOff.y;
  if (vx === 0 && vy === 0) return 0;
  return norm360(toDeg(Math.atan2(-vy, vx))); // 0°=kanan, 90°=atas
}

function rotateAroundCW(p: Point, origin: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = dx * cos + dy * sin;
  const ry = -dx * sin + dy * cos;
  return { x: origin.x + rx, y: origin.y + ry };
}

// transform-origin (percent) dari pivot
function computeOriginPct(
  pivot: "center" | "base",
  baseLocal: { xPct: number; yPct: number }
): { x: number; y: number } {
  if (pivot === "base") {
    return { x: 50 + baseLocal.xPct * 0.5, y: 50 + baseLocal.yPct * 0.5 };
  }
  return { x: 50, y: 50 };
}

export function logic5ImageAngle(prev: Bus | undefined): Bus {
  const layerCfg: LayerConfig | undefined = prev?.layer?.cfg;
  const l2a = layerCfg?.l2a;
  const centerPx = prev?.pos?.centerPx;
  const scalePx = prev?.pos?.scalePx ?? 0;
  const natural = prev?.image?.natural;

  if (!l2a || !l2a.enabled || !centerPx || !natural) {
    const bus: Bus = {
      ...(prev ?? {}),
      angle: {
        rotation2ADeg: 0,
        originPct: { x: 50, y: 50 },
        basePx: centerPx ?? { x: 0, y: 0 },
        tipPx: centerPx ?? { x: 0, y: 0 },
      },
    };
    return bus;
  }

  const baseOff0 = localPctToDisplayOffset(l2a.base.xPct, l2a.base.yPct, natural, scalePx);
  const tipOff0  = localPctToDisplayOffset(l2a.tip.xPct,  l2a.tip.yPct,  natural, scalePx);

  const currentDeg = angleOfBaseToTip(baseOff0, tipOff0);

  // align: fase ini target tegak (vertical)
  const targetDeg = l2a.align === "axis" ? currentDeg : 90;
  const rotation2ADeg = norm360(targetDeg - currentDeg);

  const originPct = computeOriginPct(l2a.pivot || "center", l2a.base);

  const originOff = l2a.pivot === "base" ? baseOff0 : { x: 0, y: 0 };
  const baseOffR = rotateAroundCW(baseOff0, originOff, rotation2ADeg);
  const tipOffR  = rotateAroundCW(tipOff0,  originOff, rotation2ADeg);

  const basePx: Point = { x: centerPx.x + baseOffR.x, y: centerPx.y + baseOffR.y };
  const tipPx:  Point = { x: centerPx.x + tipOffR.x,  y: centerPx.y + tipOffR.y };

  const bus: Bus = {
    ...(prev ?? {}),
    angle: { rotation2ADeg, originPct, basePx, tipPx },
  };
  return bus;
}
