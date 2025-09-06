// File: src/Launcher/LauncherLogic1LayerProducer.ts
// Rumah-1: Produce objek Bus awal dari LayerConfig. Tidak nambah field liar.
// Siapkan image stub; natural akan diperbarui di Rumah-3.

import type { Bus, LayerConfig } from "./LauncherHubTypes";

export function logic1LayerProducer(_bus: Bus | undefined, layer: LayerConfig, _index: number): Bus {
  const next: Bus = {
    id: layer.id,
    path: layer.path || "",
    enabled: !!layer.enabled,
    zHint: layer.zHint || 0,
    cfg: layer,
    // stub image: natural akan diisi oleh Rumah-3 dari ctx.natural
    image: { natural: { w: 0, h: 0 }, localSpace: "image-centered" },
  };
  return next;
}
