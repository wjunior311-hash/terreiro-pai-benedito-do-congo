import React from 'react'

export const ORIXAS=[['oxala','Oxalá'],['exu','Exu'],['ogum','Ogum'],['oxossi','Oxóssi'],['xango','Xangô'],['iansa','Iansã'],['oxum','Oxum'],['iemanja','Iemanjá'],['obalue','Obaluaiê'],['nana','Nanã'],['oxumare','Oxumarê'],['ossaim','Ossaim'],['logunede','Logunedé']]
const old={'⚪':'oxala','⚔️':'ogum','💛':'oxum','🌊':'iemanja','⚡':'xango','🌪️':'iansa','🏹':'oxossi','🪻':'nana','🌾':'obalue','🦋':'logunede','🔥':'exu','🌿':'ossaim','🌙':'ewá','🪨':'obá'}
export const normalizeOrixa=v=>old[v]||v||'oxala'
const specialAssets={
  oxala:import.meta.env.BASE_URL+'oxala.svg',
  exu:import.meta.env.BASE_URL+'exu.svg',
  ogum:import.meta.env.BASE_URL+'ogum.svg',
  oxossi:import.meta.env.BASE_URL+'oxossi.svg',
  xango:import.meta.env.BASE_URL+'xango.svg',
  iansa:import.meta.env.BASE_URL+'iansa.svg',
  oxum:import.meta.env.BASE_URL+'oxum.svg',
  iemanja:import.meta.env.BASE_URL+'iemanja.svg',
  obalue:import.meta.env.BASE_URL+'obalue.svg',
  nana:import.meta.env.BASE_URL+'nana.svg',
  oxumare:import.meta.env.BASE_URL+'oxumare.svg',
  ossaim:import.meta.env.BASE_URL+'ossaim.svg',
  logunede:import.meta.env.BASE_URL+'logunede.svg'
}
export function OrixaIcon({name,size=54,className=''}){const n=normalizeOrixa(name),special=specialAssets[n];const title=ORIXAS.find(x=>x[0]===n)?.[1]||n;if(special)return <img src={special} className={className} width={size} height={size} alt={title} title={title} style={{display:'inline-block',width:size,height:size,flex:'0 0 auto',objectFit:'contain'}}/>;return <span className={className} style={{display:'inline-block',width:size,height:size,borderRadius:'50%',background:'#eee9dc'}} aria-label={n}/>}
