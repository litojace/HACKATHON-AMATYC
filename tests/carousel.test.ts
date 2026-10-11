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

test("carousel timing defaults and supported durations", () => {
  const photo = defaultCarouselPhotos[0];
  assert.equal(carouselSchema.parse([photo])[0].duration_seconds, 2.5);
  assert.equal(carouselSchema.parse([{...photo, duration_seconds: 5}])[0].duration_seconds, 5);
  for (const duration_seconds of [0, 31, "5", null]) assert.equal(carouselSchema.safeParse([{...photo, duration_seconds}]).success, false);
});

test("carousel applies one timing to every slide", () => {
 const photo = defaultCarouselPhotos[0];
 assert.deepEqual(carouselSchema.parse([{...photo, duration_seconds: 4}, {...photo, duration_seconds: 8}]).map(p => p.duration_seconds), [4, 4]);
});
