// Curated set of freely-licensed (Unsplash License) photos a user can pick
// as their app background. Must stay in sync with the whitelist enforced
// server-side in shiftline-backend/src/modules/identity/wallpapers.ts.
export const WALLPAPER_URLS = [
  "https://images.unsplash.com/photo-1759851942096-cf73a51532ba",
  "https://images.unsplash.com/photo-1752679813117-49fdab167868",
  "https://images.unsplash.com/photo-1761429528505-e153940c62a1",
  "https://images.unsplash.com/photo-1761888855526-674732099103",
  "https://images.unsplash.com/photo-1772733694354-3b4a33568ef4",
  "https://images.unsplash.com/photo-1648563643923-2091f9c0c12f",
  "https://images.unsplash.com/photo-1745403322174-626cac65213c",
] as const;

export function wallpaperThumbUrl(url: string): string {
  return `${url}?auto=format&fit=crop&w=200&q=60`;
}

export function wallpaperFullUrl(url: string): string {
  return `${url}?auto=format&fit=crop&w=1600&q=70`;
}
