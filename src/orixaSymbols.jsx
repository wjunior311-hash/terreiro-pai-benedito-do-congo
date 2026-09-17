import React from 'react'

export const ORIXAS=[
 ['oxala','Oxalá'],['exu','Exu'],['ogum','Ogum'],['oxossi','Oxóssi'],['xango','Xangô'],['iansa','Iansã'],['oxum','Oxum'],['iemanja','Iemanjá'],['obalue','Obaluaiê'],['nana','Nanã'],['oxumare','Oxumarê'],['ossaim','Ossaim'],['logunede','Logunedé'],['ibeji','Ibeji']
]
const old={'⚪':'oxala','⚔️':'ogum','💛':'oxum','🌊':'iemanja','⚡':'xango','🌪️':'iansa','🏹':'oxossi','🪻':'nana','🌾':'obalue','🦋':'logunede','🔥':'exu','🌿':'ossaim','🌙':'ewá','🪨':'obá'}
export const normalizeOrixa=v=>old[v]||v||'oxala'
export function OrixaIcon({name,size=54,className=''}){
 const n=normalizeOrixa(name)
 const stroke=n==='exu'?'#a52a24':n==='ogum'||n==='iemanja'||n==='logunede'?'#1f5570':n==='oxossi'||n==='ossaim'?'#275b35':n==='oxum'||n==='ibeji'?'#c6921b':n==='xango'||n==='obalue'?'#8b4a28':n==='iansa'?'#a52222':n==='nana'?'#54204f':n==='oxumare'?'#2f6b45':'#8b836e'
 const p={width:size,height:size,viewBox:'0 0 100 100',className,fill:'none',stroke,strokeWidth:3,strokeLinecap:'round',strokeLinejoin:'round'}
 if(n==='exu')return <svg {...p}><path d="M50 8v84M28 28h44M38 16l-10 12M62 16l10 12"/><path d="M31 38q-10 12 0 24M69 38q10 12 0 24"/><circle cx="50" cy="91" r="3" fill={stroke}/></svg>
 if(n==='ogum')return <svg {...p}><path d="M50 7v65M40 18l10-11 10 11M30 77h40M36 86h28"/><circle cx="25" cy="72" r="8"/><circle cx="75" cy="72" r="8"/><path d="M33 72h34"/></svg>
 if(n==='oxossi')return <svg {...p}><path d="M50 8v84M50 8l-6 12M50 8l6 12M24 25q26 25 0 50M76 25Q50 50 76 75"/><path d="M30 50h40M30 50l-8-5M30 50l-8 5"/><circle cx="35" cy="34" r="2" fill={stroke}/><circle cx="65" cy="34" r="2" fill={stroke}/></svg>
 if(n==='xango')return <svg {...p}><path d="M50 12v76M38 22h24M35 30l-13-12M65 30l13-12"/><path d="M17 25q-7 8 0 16M83 25q7 8 0 16M17 59q-7 8 0 16M83 59q7 8 0 16"/><path d="M35 46h30"/></svg>
 if(n==='iansa')return <svg {...p}><path d="M50 8c25 15 25 34 3 42-18 7-23 20-4 42"/><path d="M50 92c-25-15-25-34-3-42 18-7 23-20 4-42"/><circle cx="20" cy="27" r="2"/><circle cx="80" cy="73" r="2"/><circle cx="17" cy="73" r="2"/></svg>
 if(n==='oxum')return <svg {...p}><ellipse cx="50" cy="28" rx="18" ry="15"/><path d="M25 48q25 14 50 0M20 62q30 16 60 0M15 76q35 17 70 0"/><circle cx="50" cy="9" r="3"/><circle cx="50" cy="92" r="3"/></svg>
 if(n==='iemanja')return <svg {...p}><path d="M50 8l7 17-7 15-7-15z"/><path d="M20 52q30-22 60 0M15 66q35-25 70 0M12 81q38-25 76 0"/><circle cx="50" cy="43" r="3"/></svg>
 if(n==='obalue')return <svg {...p}><path d="M25 30h50M35 20h30M50 20v70M28 32l8 58M38 32l6 58M62 32l-6 58M72 32l-8 58"/><circle cx="50" cy="10" r="4"/></svg>
 if(n==='nana')return <svg {...p}><path d="M55 10q18 8 0 24M55 34v55M30 55h15M65 55h15M30 66h15M65 66h15M30 77h15M65 77h15"/></svg>
 if(n==='oxumare')return <svg {...p}><path d="M65 10c-30 0-30 25 0 25s30 25 0 25-30 25 0 30"/><path d="M35 28q-12 10-15 22M35 50q-12 10-15 22M68 28q12 10 15 22M68 50q12 10 15 22"/></svg>
 if(n==='ossaim')return <svg {...p}><path d="M50 90V15M50 30l-18-12M50 45l20-15M50 60l-22-15M50 72l20-15"/><path d="M32 18l-8-8M70 30l8-8M28 45l-10-5M70 57l10-5"/></svg>
 if(n==='logunede')return <svg {...p}><path d="M50 8v84M50 8l-6 12M50 8l6 12"/><path d="M27 30q23 20 0 40M73 30Q50 50 73 70"/><circle cx="28" cy="37" r="7"/><circle cx="72" cy="37" r="7"/><path d="M15 76q35-20 70 0M12 87q38-20 76 0"/></svg>
 if(n==='ibeji')return <svg {...p}><circle cx="35" cy="30" r="9"/><circle cx="65" cy="30" r="9"/><path d="M35 39v38M65 39v38M27 77h16M57 77h16"/><circle cx="35" cy="88" r="3"/><circle cx="65" cy="88" r="3"/></svg>
 return <svg {...p}><path d="M50 10v80M30 35h40M30 65h40"/></svg>
}
