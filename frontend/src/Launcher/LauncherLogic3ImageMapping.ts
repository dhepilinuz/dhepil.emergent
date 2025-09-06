// File: src/Launcher/LauncherLogic3ImageMapping.ts
// Rumah-3: Image Mapping. Pastikan bus.image selalu ada dan `localSpace` literal.

import type { Bus, FrameCtx } from "./LauncherHubTypes";

export function logic3ImageMapping(bus: Bus | undefined, ctx: FrameCtx): Bus {
  const next: Bus = bus ? { ...bus } : ({} as Bus);

  // Pastikan image block ada
  if (!next.image) {
    next.image = { natural: { w: 0, h: 0 }, localSpace: "image-centered" };
  }

  // Update natural dari ctx jika tersedia
  if (ctx.natural && ctx.natural.w > 0 && ctx.natural.h > 0) {
    next.image = {
      natural: { w: ctx.natural.w, h: ctx.natural.h },
      localSpace: "image-centered",
    };
  } else {
    // tetap set literal type
    next.image = {
      natural: { w: next.image.natural?.w || 0, h: next.image.natural?.h || 0 },
      localSpace: "image-centered",
    };
  }

  // Tidak menambahkan properti lain seperti `src`
  return next;
}
