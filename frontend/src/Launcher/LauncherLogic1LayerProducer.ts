// File: src/Launcher/LauncherLogic1LayerProducer.ts
// Rumah 1: Layer Producer. Inisialisasi bus per-layer dari config.
// Hasil: bus.layer terisi (id, index, cfg) dan bus.image.src diset.

import type { Bus, LayerConfig } from "./LauncherHubTypes";

export function logic1LayerProducer(
  prev: Bus | undefined,
  layer: LayerConfig,
  index: number
): Bus {
  const base: Bus = prev ? { ...prev } : {};

  // Catat meta layer
  base.layer = {
    id: layer.id,
    index,
    cfg: layer,
  };

  // Siapkan info image minimal (natural size akan diisi di rumah 3 dari ctx)
  base.image = {
    ...(base.image ?? {}),
    src: layer.path,
  };

  // Bersih-bersih hasil rumah berikutnya biar gak bawa sisa frame lama
  base.pos = undefined;
  base.angle = undefined;
  base.spin = undefined;
  base.orbit = undefined;
  base.clock = undefined;

  return base;
}
