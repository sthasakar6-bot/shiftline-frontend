// Curated set of solid/gradient color backgrounds a user can pick as their
// app wallpaper. Keys must stay in sync with the whitelist enforced
// server-side in shiftline-backend/src/modules/identity/wallpapers.ts.
export const WALLPAPER_URLS = ["aurora", "sunset", "ocean", "forest", "berry", "sand", "slate"] as const;

export type WallpaperKey = (typeof WALLPAPER_URLS)[number];

const GRADIENTS: Record<WallpaperKey, string> = {
  aurora: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  sunset: "linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)",
  ocean: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  forest: "linear-gradient(135deg, #43a047 0%, #a8e063 100%)",
  berry: "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)",
  sand: "linear-gradient(135deg, #e8d9a0 0%, #c9a66b 100%)",
  slate: "linear-gradient(135deg, #485563 0%, #29323c 100%)",
};

export function wallpaperGradient(key: string): string {
  return GRADIENTS[key as WallpaperKey] ?? GRADIENTS.aurora;
}
