import Image from "next/image";

export default function MathOrbit() {
  return <div className="hero-art">
    <Image src="/images/math-orbits.png" alt="Gold and cyan mathematical rings with orbiting spheres" width={1536} height={1024} priority sizes="(max-width: 1023px) 53vw, 48vw" />
    <span className="orbit-formula formula-euler" aria-hidden="true">e<sup>iπ</sup> + 1 = 0</span>
    <span className="orbit-formula formula-integral" aria-hidden="true">∫ f(x) dx</span>
  </div>;
}
