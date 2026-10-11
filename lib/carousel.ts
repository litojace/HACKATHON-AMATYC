import { z } from "zod";
export const carouselPhotoSchema = z.object({
  src: z.string().max(2048).refine(value => /^\/images\/[A-Za-z0-9_./-]+$/.test(value) && !value.includes("..") || (() => { try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } })(), "Use an image path or HTTPS URL"),
  alt: z.string().trim().min(1).max(240),
  label: z.string().trim().min(1).max(80),
  fit: z.enum(["cover", "contain"]),
  duration_seconds: z.number().min(1).max(30).default(2.5),
});
export const carouselSchema = z.array(carouselPhotoSchema).min(1).max(10).transform(photos => photos.map(photo => ({...photo, duration_seconds: photos[0].duration_seconds})));
export type CarouselPhoto = z.input<typeof carouselPhotoSchema>;
export const defaultCarouselPhotos: CarouselPhoto[] = [
  {
    src: "/images/community/student-math-league.png",
    alt: "AMATYC Student Math League competition flyer",
    label: "Math League",
    fit: "contain",
  },
  {
    src: "/images/community/practice-session.png",
    alt: "Students working together during a math practice session",
    label: "Practice",
    fit: "cover",
  },
  {
    src: "/images/community/pizza.png",
    alt: "Two pizzas",
    label: "Pizza",
    fit: "cover",
  },
  {
    src: "/images/community/whiteboard.png",
    alt: "A student solving math problems on a whiteboard",
    label: "Problem solving",
    fit: "cover",
  },
  {
    src: "/images/community/team.png",
    alt: "Students gathered after a math practice session",
    label: "Our team",
    fit: "cover",
  },
];

