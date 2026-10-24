import Image, { getImageProps } from "next/image";
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
const axisOrigin = { x:768, y:510 };
const axisLength = 390;
const axes = [
  { label:"x", dx:-Math.cos(Math.PI / 12), dy:Math.sin(Math.PI / 12) },
  { label:"y", dx:1, dy:0 },
  { label:"z", dx:0, dy:-1 },
];

export default function MathOrbit() {
  const id = useId().replace(/:/g, "");
  const { props: depthImage } = getImageProps({ src:"/images/math-orbits-core.png", alt:"", width:640, height:427 });
  const depthSource = depthImage.srcSet?.split(", ")[0].split(" ")[0] ?? depthImage.src;
  function sphere(radius: number) {
    return <>
      <circle r={radius * 2.4} fill={`url(#${id}-halo)`} />
      <circle className="electron-core" r={radius} fill={`url(#${id}-gold)`} stroke="#fff1a8" strokeWidth="1" />
      <circle cx={-radius * .3} cy={-radius * .35} r={radius * .2} fill="#fffce2" opacity=".9" />
    </>;
  }
  function electronLayer(rear: boolean) {
    return electrons.map((electron,i)=><g key={i} data-electron={i} opacity={rear ? 0 : 1}>
      <animate attributeName="opacity" values={rear ? "0;0;1;1;0" : "1;1;0;0;1"} keyTimes="0;.46;.5;.96;1" dur={`${electron.duration}s`} begin={`${-electron.duration * electron.phase}s`} repeatCount="indefinite" />
      <g opacity=".22">
        <circle r={electron.radius * .45} fill="#ffdd74" />
        <animateMotion dur={`${electron.duration}s`} begin={`${-electron.duration * electron.phase + .13}s`} repeatCount="indefinite" path={tracks[electron.track]} calcMode="paced" />
      </g>
      <g className="electron-orb">
        {sphere(electron.radius)}
        <animateMotion dur={`${electron.duration}s`} begin={`${-electron.duration * electron.phase}s`} repeatCount="indefinite" path={tracks[electron.track]} calcMode="paced" />
      </g>
    </g>);
  }
  return <div className="hero-art">
    <div className="orbit-rings-frame">
      <Image className="orbit-rings" src="/images/math-orbits-core.png" alt="Gold and cyan mathematical rings with glowing electrons orbiting around them" width={1536} height={1024} priority sizes="(max-width: 1023px) 46vw, 48vw" />
    </div>
    <svg className="orbit-electrons" viewBox="0 0 1536 1024" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-gold`} cx="30%" cy="25%" r="75%"><stop stopColor="#fffce0"/><stop offset=".25" stopColor="#ffe69a"/><stop offset=".6" stopColor="#dba62b"/><stop offset="1" stopColor="#785018"/></radialGradient>
        <radialGradient id={`${id}-halo`}><stop stopColor="#ffcf58" stopOpacity=".45"/><stop offset=".5" stopColor="#ffcf58" stopOpacity=".12"/><stop offset="1" stopColor="#ffcf58" stopOpacity="0"/></radialGradient>
        {/* Bright ring surfaces hide rear particles; the dark gaps stay transparent. */}
        <filter id={`${id}-ring-surface`} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix type="matrix" values="-2.126 -7.152 -.722 0 1.6  -2.126 -7.152 -.722 0 1.6  -2.126 -7.152 -.722 0 1.6  0 0 0 1 0" />
        </filter>
        <mask id={`${id}-ring-depth`} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024" style={{maskType:"luminance"}}>
          <rect width="1536" height="1024" fill="white" />
          <image className="orbit-ring-occluder" href={depthSource} width="1536" height="1024" preserveAspectRatio="none" filter={`url(#${id}-ring-surface)`} />
        </mask>
        <radialGradient id={`${id}-axis-depth`} gradientUnits="userSpaceOnUse" cx={axisOrigin.x} cy={axisOrigin.y} r="320">
          <stop stopColor="#edf3ff" stopOpacity=".12" />
          <stop offset=".4" stopColor="#edf3ff" stopOpacity=".14" />
          <stop offset=".75" stopColor="#edf3ff" stopOpacity=".35" />
          <stop offset="1" stopColor="#edf3ff" />
        </radialGradient>
        <marker id={`${id}-axis-arrow`} viewBox="0 0 24 24" refX="20" refY="12" markerWidth="24" markerHeight="24" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M2 4 22 12 2 20 7 12Z" fill="#f1f5ff" />
        </marker>
      </defs>
      <g className="orbit-axes" fill="none" stroke={`url(#${id}-axis-depth)`}>
        {axes.map(({label,dx,dy})=><g key={label}>
          <path className="orbit-axis-negative" d={`M${axisOrigin.x} ${axisOrigin.y} l${-dx * axisLength} ${-dy * axisLength}`} />
          <path className="orbit-axis-positive" d={`M${axisOrigin.x} ${axisOrigin.y} l${dx * axisLength} ${dy * axisLength}`} markerEnd={`url(#${id}-axis-arrow)`} />
          <text className="orbit-axis-label" x={axisOrigin.x + dx * (axisLength + 32)} y={axisOrigin.y + dy * (axisLength + 32)} textAnchor="middle" dominantBaseline="central">{label}</text>
        </g>)}
      </g>
      <g className="electron-tracks" fill="none" stroke="#edc767" strokeWidth="1.2">
        {tracks.map((path,i)=><path key={i} d={path} opacity={i===0 ? .55 : .22} strokeDasharray={i===2 ? "5 12" : undefined} />)}
      </g>
      <g className="electrons-moving">
        <g className="electrons-back" mask={`url(#${id}-ring-depth)`}>{electronLayer(true)}</g>
        <g className="electrons-front">{electronLayer(false)}</g>
      </g>
      <g className="electrons-still">
        {[[837,134],[262,343],[1270,362],[394,670],[1067,729]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}>{sphere(electrons[i].radius)}</g>)}
      </g>
    </svg>
    <span className="orbit-formula formula-euler" aria-hidden="true">e<sup>iπ</sup> + 1 = 0</span>
    <span className="orbit-formula formula-integral" aria-hidden="true">∫ f(x) dx</span>
  </div>;
}
