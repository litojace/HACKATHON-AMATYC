import { test } from "node:test";
import assert from "node:assert/strict";
import { carouselSchema, defaultCarouselPhotos } from "../lib/carousel";
test("carousel validates image sources, captions and slide limits", () => {
  assert.ok(carouselSchema.safeParse(defaultCarouselPhotos).success);
  const photo = defaultCarouselPhotos[0];
  assert.ok(carouselSchema.safeParse([{...photo, src: "https://example.com/photo.png"}]).success);
  for (const src of ["javascript:alert(1)", "http://example.com/a.png", "//example.com/a.png", "/images/../secret", "https://user:password@example.com/a.png"]) {
    assert.equal(carouselSchema.safeParse([{...photo, src}]).success, false);
  }
  assert.equal(carouselSchema.safeParse([]).success, false);
  assert.equal(carouselSchema.safeParse(Array(11).fill(photo)).success, false);
  assert.equal(carouselSchema.safeParse([{...photo, label: " "}]).success, false);
});
