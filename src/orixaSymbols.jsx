import React from 'react'

export const ORIXAS=[
 ['oxala','Oxalá'],['exu','Exu'],['ogum','Ogum'],['oxossi','Oxóssi'],['xango','Xangô'],['iansa','Iansã'],['oxum','Oxum'],['iemanja','Iemanjá'],['obalue','Obaluaiê'],['nana','Nanã'],['oxumare','Oxumarê'],['ossaim','Ossaim'],['logunede','Logunedé'],['ibeji','Ibeji']
]
const old={'⚪':'oxala','⚔️':'ogum','💛':'oxum','🌊':'iemanja','⚡':'xango','🌪️':'iansa','🏹':'oxossi','🪻':'nana','🌾':'obalue','🦋':'logunede','🔥':'exu','🌿':'ossaim','🌙':'ewá','🪨':'obá'}
export const normalizeOrixa=v=>old[v]||v||'oxala'

const sprite=import.meta.env.BASE_URL+'orixa-sprite.webp'
const positions={
 oxala:[0,0], exu:[1,0], ogum:[0,1], oxossi:[1,1], xango:[0,2], iansa:[1,2],
 oxum:[0,3], iemanja:[1,3], obalue:[0,4], nana:[1,4], oxumare:[0,5], ossaim:[1,5], logunede:[0,6]
}
export function OrixaIcon({name,size=54,className=''}) {
 const n=normalizeOrixa(name)
 const pos=positions[n]
 if(!pos) return <span className={className} style={{display:'inline-block',width:size,height:size,borderRadius:'50%',background:'#eee9dc'}} aria-label={n}/>
 const [col,row]=pos
 return <span
   className={className}
   aria-label={n}
   title={ORIXAS.find(x=>x[0]===n)?.[1]||n}
   style={{
     display:'inline-block',width:size,height:size,flex:'0 0 auto',
     backgroundImage:`url(${sprite})`,
     backgroundRepeat:'no-repeat',
     backgroundSize:`${size*2}px ${size*7}px`,
     backgroundPosition:`-${col*size}px -${row*size}px`
   }}
 />
}
