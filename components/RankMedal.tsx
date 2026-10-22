import { useId } from "react";

const metals = {
  bronze: {name:"Bronze",light:"#ffe0b1",mid:"#b67b4d",dark:"#503125",face:"#795038",edge:"#d6a070"},
  silver: {name:"Silver",light:"#ffffff",mid:"#aab8c3",dark:"#344450",face:"#637480",edge:"#e0e9ef"},
  gold: {name:"Gold",light:"#fff4bd",mid:"#f1c54f",dark:"#735316",face:"#a17a27",edge:"#ffe697"},
};
export default function RankMedal({ metal }: {metal:keyof typeof metals}) {
  const c=metals[metal], id=useId().replace(/:/g,"");
  const star="50,30 55.5,43 69.5,44.5 59,54 62.5,68 50,60.5 37.5,68 41,54 30.5,44.5 44.5,43";
  return <span className={`rank-medal medal-${metal}`}>
    <svg viewBox="0 0 100 104" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-metal`} x1="20" y1="10" x2="80" y2="92" gradientUnits="userSpaceOnUse"><stop stopColor={c.light}/><stop offset=".25" stopColor={c.mid}/><stop offset=".55" stopColor={c.dark}/><stop offset="1" stopColor={c.mid}/></linearGradient>
        <linearGradient id={`${id}-face`} x1="30" y1="23" x2="75" y2="83" gradientUnits="userSpaceOnUse"><stop stopColor={c.face}/><stop offset="1" stopColor={c.dark}/></linearGradient>
        <linearGradient id={`${id}-star`} x1="35" y1="30" x2="67" y2="70" gradientUnits="userSpaceOnUse"><stop stopColor={c.light}/><stop offset=".5" stopColor={c.mid}/><stop offset="1" stopColor={c.edge}/></linearGradient>
      </defs>
      {metal==="gold" && <g fill={c.mid} stroke={c.mid}>
        <path d="M45 97C12 87 2 60 14 31M55 97C88 87 98 60 86 31" strokeWidth="1.5"/>
        {[0,1,2,3,4,5].map(i=><g key={i}>
          <ellipse cx={9+i*.5} cy={34+i*8} rx="2.3" ry="5.5" transform={`rotate(${-20-i*9} ${9+i*.5} ${34+i*8})`}/>
          <ellipse cx={91-i*.5} cy={34+i*8} rx="2.3" ry="5.5" transform={`rotate(${20+i*9} ${91-i*.5} ${34+i*8})`}/>
        </g>)}
        <path d="m15 78 2 8 9 3-5-9zm70 0-2 8-9 3 5-9zM26 89l7 7 9-1-9-5zm48 0-7 7-9-1 9-5z" stroke="none"/>
      </g>}
      <path d="M50 5 86 26v44L50 92 14 70V26Z" fill={`url(#${id}-metal)`}/>
      <path d="M50 9 82 28v40L50 87 18 68V28Z" stroke={c.edge} strokeWidth="1.5"/>
      <path d="M50 15 76 31v34L50 81 24 65V31Z" fill={`url(#${id}-face)`} stroke={c.dark} strokeWidth="1.5"/>
      <path d="m24 31 26-16 26 16-5 3L50 21 29 34Z" fill={c.light} opacity=".18"/>
      <polygon points={star} transform="translate(0 2)" fill={c.dark}/>
      <polygon points={star} fill={`url(#${id}-star)`} stroke={c.light} strokeWidth=".6"/>
      <path d="m50 30 0 20-19.5-5.5L44.5 43Z" fill={c.light} opacity=".45"/>
      <path d="m50 50 12.5 18L59 54l10.5-9.5Z" fill={c.dark} opacity=".25"/>
    </svg>
    <span>{c.name}</span>
  </span>;
}
