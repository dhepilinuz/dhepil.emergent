// File: src/Launcher/LauncherLogic2LayerMapping.ts
// Rumah 2: Layer Mapping. Tempat adaptasi/normalisasi ringan sebelum image mapping.
// Untuk fase ini: pass-through terkontrol (menyentuh ctx agar lolos noUnused).

import type { Bus, FrameCtx } from "./LauncherHubTypes";

export function logic2LayerMapping(prev: Bus | undefined, ctx: FrameCtx): Bus {
  // sentuh ctx supaya TypeScript tidak ngamuk noUnusedParameters
  // (bisa dipakai nanti untuk adaptasi user-space → engine-space)
  void ctx.nowMs;

  // Tidak ada transform khusus di fase ini; cukup teruskan bus.
  return prev ? { ...prev } : {};
}
