// File: src/Launcher/LauncherLogic6Spin.ts
// Rumah-6: Spin absolut. Token konsisten: { t0Ms, deg0 }.

import type { Bus, FrameCtx, SpinToken, LayerConfig } from "./LauncherHubTypes";

// Rebase spin jika parameter inti berubah
export function shouldRebaseSpin(prev?: LayerConfig["spin"], next?: LayerConfig["spin"]): boolean {
  const p = prev || undefined;
  const n = next || undefined;
  const on = !!n?.enabled;

  // Saat mati → nggak perlu rebase
  if (!on) return !!p?.enabled; // kalau sebelumnya on, matikan token

  return (
    (!!p?.enabled !== !!n?.enabled) ||
    (p?.rpm ?? 0) !== (n?.rpm ?? 0) ||
    (p?.direction ?? "cw") !== (n?.direction ?? "cw") ||
    (p?.pivotSource ?? "logic2-center") !== (n?.pivotSource ?? "logic2-center")
  );
}

export function makeSpinToken(t0Ms: number, deg0: number): SpinToken {
  return { t0Ms, deg0 };
}

export function logic6Spin(bus: Bus | undefined, ctx: FrameCtx, token: SpinToken | null | undefined): Bus {
  const next: Bus = bus ? { ...bus } : ({} as Bus);
  const cfg = next.cfg?.spin;

  if (!cfg?.enabled || !token) {
    next.spin = { deg: 0 };
    return next;
  }

  const sign = cfg.direction === "ccw" ? -1 : 1;
  const rpm = Math.max(0, Number(cfg.rpm || 0));
  const elapsedMs = Math.max(0, ctx.nowMs - token.t0Ms);
  const deltaDeg = sign * rpm * 360 * (elapsedMs / 60000);
  const deg = token.deg0 + deltaDeg;

  next.spin = { deg };
  return next;
}
