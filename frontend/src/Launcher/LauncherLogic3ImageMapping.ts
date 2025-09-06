// File: src/Launcher/LauncherLogic3ImageMapping.ts
// Rumah 3: Image Mapping. Sinkronkan natural size dari ctx → bus.
// Simpel: kalau ctx.natural ada, tulis ke bus.image.natural.

import type { Bus, FrameCtx } from "./LauncherHubTypes";

export function logic3ImageMapping(prev: Bus | undefined, ctx: FrameCtx): Bus {
  const next: Bus = { ...(prev ?? {}) };
  if (!next.image) next.image = { src: "" };

  if (ctx.natural) {
    // Natural size diisi saat <img onLoad>; ctx.natural dibawa Hub per-layer.
    next.image = { ...next.image, natural: ctx.natural };
  } else {
    // Belum ada natural size, biarkan undefined (pipeline tetap jalan).
    next.image = { ...next.image, natural: next.image.natural };
  }
  return next;
}
