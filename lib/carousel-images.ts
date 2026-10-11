/** Optimize bundled photos and this project's public carousel bucket only. */
export function canOptimizeCarouselImage(src: string, storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): boolean {
  if (src.startsWith("/images/") && !src.includes("..")) return true;
  if (!storageUrl) return false;
  try {
    const image = new URL(src), storage = new URL(storageUrl);
    return image.protocol === "https:" && image.origin === storage.origin &&
      !image.username && !image.password && !image.search &&
      image.pathname.startsWith("/storage/v1/object/public/carousel-images/");
  } catch { return false; }
}
