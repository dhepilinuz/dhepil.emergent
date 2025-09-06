// File: src/Launcher/LauncherLogic6Spin.ts
// Rumah 6: Spin (Logic-3). Hitung derajat rotasi absolut berbasis waktu.
// Disertai util rebase token saat config berubah.

import type { Bus, FrameCtx, LayerConfig, SpinToken } from "./LauncherHubTypes";
import { norm360 } from "./LauncherUtilMath";

/* ==============================
   Util internal
   ============================== */
function rpmToDegPerMs(rpm: number, dir: "cw" | "ccw"): number {
  const sign = dir === "ccw" ? -1 : 1;
  return sign * (rpm * 360) / 60000;
}

/* ==============================
   Token helpers
   ============================== */
export function makeSpinToken(nowMs: number, currentDeg: number): SpinToken {
  // Simpan fase saat ini sebagai theta0, lalu lanjut dari waktu nowMs.
  return { t0Ms: nowMs, theta0Deg: norm360(currentDeg) };
}

export function shouldRebaseSpin(prevCfg?: LayerConfig["spin"], nextCfg?: LayerConfig["spin"]): boolean {
  const p = prevCfg, n = nextCfg;
  if (!!(p?.enabled) !== !!(n?.enabled)) return true;
  if ((p?.rpm || 0) !== (n?.rpm || 0)) return true;
  if ((p?.direction || "cw") !== (n?.direction || "cw")) return true;
  if ((p?.pivotSource || "logic2-center") !== (n?.pivotSource || "logic2-center")) return true;
  // maxFps/easing tidak mempengaruhi fase, jadi abaikan.
  return false;
}

/* ==============================
   Eksekutor Rumah-6
   ============================== */
export function logic6Spin(prev: Bus | undefined, ctx: FrameCtx, token: SpinToken | null | undefined): Bus {
  const cfg = prev?.layer?.cfg?.spin;
  if (!cfg || !cfg.enabled) {
    return { ...(prev ?? {}), spin: { deg: 0 } };
  }

  const rpm = Math.max(0, cfg.rpm || 0);
  if (rpm <= 0 || !token) {
    // spin off atau belum ada token → nol
    return { ...(prev ?? {}), spin: { deg: 0 } };
  }

  const dpsMs = rpmToDegPerMs(rpm, cfg.direction || "cw");
  const dt = Math.max(0, ctx.nowMs - token.t0Ms);
  const deg = norm360(token.theta0Deg + dpsMs * dt);

  const bus: Bus = { ...(prev ?? {}), spin: { deg } };
  return bus;
}
