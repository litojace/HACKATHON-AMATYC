import test from "node:test";
import assert from "node:assert/strict";
import { canOptimizeCarouselImage } from "../lib/carousel-images";
test("image optimization only fetches local photos and the configured carousel bucket", () => {
  const storage = "https://project.supabase.co";
  assert.equal(canOptimizeCarouselImage("/images/community/photo.png", storage), true);
  assert.equal(canOptimizeCarouselImage(storage + "/storage/v1/object/public/carousel-images/photo.png", storage), true);
  for (const src of ["https://other.example/photo.png", "http://project.supabase.co/storage/v1/object/public/carousel-images/a.png", storage + "/storage/v1/object/public/avatars/a.png", storage + "/storage/v1/object/public/carousel-images/a.png?token=x", "/images/../secret", "invalid"]) assert.equal(canOptimizeCarouselImage(src, storage), false, src);
});
