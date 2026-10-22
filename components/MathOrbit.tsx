import Image from "next/image";
import { useId } from "react";

// Native SVG motion keeps the orbit smooth without a React render loop.
function ellipsePath(cx: number, cy: number, rx: number, ry: number, angle: number) {
  const rotation = angle * Math.PI / 180;
  function point(x: number, y: number) {
    return `${(cx + x * Math.cos(rotation) - y * Math.sin(rotation)).toFixed(2)},${(cy + x * Math.sin(rotation) + y * Math.cos(rotation)).toFixed(2)}`;
  }
  const k = 0.5522847498;
  return `M${point(rx, 0)} C${point(rx, k * ry)} ${point(k * rx, ry)} ${point(0, ry)} C${point(-k * rx, ry)} ${point(-rx, k * ry)} ${point(-rx, 0)} C${point(-rx, -k * ry)} ${point(-k * rx, -ry)} ${point(0, -ry)} C${point(k * rx, -ry)} ${point(rx, -k * ry)} ${point(rx, 0)} Z`;
}
const tracks = [
  ellipsePath(768, 448, 535, 285, -9),
  ellipsePath(768, 460, 520, 285, 24),
  ellipsePath(768, 460, 490, 335, -29),
];
const electrons = [
  {track:0, duration:14, phase:0.05, radius:15},
  {track:0, duration:14, phase:0.5, radius:13},
  {track:1, duration:18, phase:0.2, radius:15},
  {track:1, duration:18, phase:0.7, radius:12},
  {track:2, duration:22, phase:0.4, radius:14},
];

export default function MathOrbit() {
  const id = useId().replace(/:/g, "");
  function sphere(radius: number) {
    return <>
      <circle r={radius * 2.4} fill={`url(#${id}-halo)`} />
      <circle className="electron-core" r={radius} fill={`url(#${id}-gold)`} stroke="#fff1a8" strokeWidth="1" />
      <circle cx={-radius * .3} cy={-radius * .35} r={radius * .2} fill="#fffce2" opacity=".9" />
    </>;
  }
  return <div className="hero-art">
    <Image className="orbit-rings" src="/images/math-orbits-core.png" alt="Gold and cyan mathematical rings with glowing electrons orbiting around them" width={1536} height={1024} priority sizes="(max-width: 1023px) 46vw, 48vw" />
    <svg className="orbit-electrons" viewBox="0 0 1536 1024" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-gold`} cx="30%" cy="25%" r="75%"><stop stopColor="#fffce0"/><stop offset=".25" stopColor="#ffe69a"/><stop offset=".6" stopColor="#dba62b"/><stop offset="1" stopColor="#785018"/></radialGradient>
        <radialGradient id={`${id}-halo`}><stop stopColor="#ffcf58" stopOpacity=".45"/><stop offset=".5" stopColor="#ffcf58" stopOpacity=".12"/><stop offset="1" stopColor="#ffcf58" stopOpacity="0"/></radialGradient>
      </defs>
      <g className="electron-tracks" fill="none" stroke="#edc767" strokeWidth="1.2">
        {tracks.map((path,i)=><path key={i} d={path} opacity={i===0 ? .55 : .22} strokeDasharray={i===2 ? "5 12" : undefined} />)}
      </g>
      <g className="electrons-moving">
        {electrons.map((electron,i)=><g key={i}>
          <g opacity=".22">
            <circle r={electron.radius * .45} fill="#ffdd74" />
            <animateMotion dur={`${electron.duration}s`} begin={`${-electron.duration * electron.phase + .13}s`} repeatCount="indefinite" path={tracks[electron.track]} calcMode="paced" />
          </g>
          <g className="electron-orb">
            {sphere(electron.radius)}
            <animateMotion dur={`${electron.duration}s`} begin={`${-electron.duration * electron.phase}s`} repeatCount="indefinite" path={tracks[electron.track]} calcMode="paced" />
          </g>
        </g>)}
      </g>
      <g className="electrons-still">
        {[[837,134],[262,343],[1270,362],[394,670],[1067,729]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}>{sphere(electrons[i].radius)}</g>)}
      </g>
    </svg>
    <span className="orbit-formula formula-euler" aria-hidden="true">e<sup>iπ</sup> + 1 = 0</span>
    <span className="orbit-formula formula-integral" aria-hidden="true">∫ f(x) dx</span>
  </div>;
}
