// Desenho do avatar da pessoa (SVG gerado no próprio app, não ocupa espaço).
// Mesmo gerador aprovado no Ateliê de avatar.
const PELES=["#fdeee3","#f8e0cd","#f3d2b5","#e2b48c","#c68b5e","#a26a42","#7a4a2b","#4e2e1b","#3a2114","#2a170d"];
const CAB_COR=[["#1d1410","Preto"],["#3b2416","Castanho escuro"],["#6b4426","Castanho"],["#a4522b","Ruivo"],["#d6a85a","Loiro"],["#8a8580","Grisalho"],["#ece8e1","Branco"]];
const CORES=["#ffffff","#e3a948","#c4573a","#c8102e","#7b3fa0","#2b6cb0","#9bc2e6","#3f7a5a","#1b2238","#111111","#f2b6c8","#8e5b3a"];
const FUNDOS=["#efe5d4","#f7ead0","#efe3f6","#e6eef3","#e7efe1","#f8e5e1","#fbe6dc","#2a2420"];
const CABELOS=[["careca","Careca"],["raspado","Raspado"],["calvo","Calvo"],["topete","Topete"],["crespoDegrade","Crespo degradê"],["encaracoladoM","Encaracolado no topo"],["blackRaspado","Black raspado dos lados"],["blackCurtoRaspado","Black curto raspado"],["cacheadoBaguncado","Cacheado bagunçado"],["cacheadoMedio","Cacheado médio"],["texturizado","Ondulado texturizado"],["social","Social com risca"],["undercut","Penteado pra trás"],["curto","Curto"],["blackCurto","Black curto"],["black","Black"],["cacheado","Cacheado"],["puffs","Puffs"],["nago","Tranças nagô"],["trancas","Box braids"],["dreads","Dreads"],["coque","Coque"],["rabo","Rabo de cavalo"],["lisoCurto","Liso curto"],["franja","Liso com franja"],["chanel","Chanel"],["longo","Liso longo"],["onduladoCurto","Ondulado curto"],["onduladoLongo","Ondulado longo"],["cachosCurto","Cacheado curto"],["cachosLongo","Cacheado longo"]];
const PANOS=[["","Sem pano"],["oja","Ojá (pano reto)"],["touca","Pano com touca"],["turbante","Turbante"],["croche","Crochê / renda"]];
const OCULOS=[["redondo","Redondo"],["quadrado","Quadrado"],["sol","De sol"]];
const BRINCOS=[["argola","Argola"],["ponto","Pontinho"],["buzio","Búzio"]];
const SELO_ROSTO={sorriso:0,gargalhada:10,sereno:15,piscada:20,pensativo:25};
const CAPAS=[["casa","Casa",0],["ouro","Ouro",5],["mar","Mar",10],["mata","Mata",15],["tecido","Tecido",20],["barro","Barro",25]];
const BARBAS=[["curta","Barba por fazer"],["cheia","Barba cheia"],["longa","Barba longa"],["cavanhaque","Bigode + cavanhaque"],["cavanhaqueSo","Cavanhaque"],["bigode","Bigode"]];
const ROSTOS=[["sorriso","Sorridente"],["gargalhada","Gargalhada"],["sereno","Sereno"],["piscada","Piscadinha"],["pensativo","Pensativo"]];
const ROUPAS=[["branca","Branca"],["lisa","Colorida"],["estampada","Estampada"]];
const PADRAO={pele:6,cabelo:"black",cabeloCor:"#1d1410",pano:"",panoListrado:false,panoCor:"#7b3fa0",listra:"#e3a948",roupa:"branca",roupaCor:"#c4573a",estampaCor:"#1b2238",conta1:"#e3a948",conta2:"#ffffff",semContas:false,barba:"",oculos:"",brinco:"",brincoLado:"ambos",fundo:"#efe5d4",orixa:"oxum",rosto:"sorriso",capa:"casa"};
let _id=0;
function rosto(r){
 const iris="#2a1a12", boca="#4a2418";
 const olho=(x,dx=0,dy=0)=>`<ellipse cx="${x}" cy="97" rx="4.6" ry="4.1" fill="#fff"/><circle cx="${x+dx}" cy="${97.3+dy}" r="3.1" fill="${iris}"/><circle cx="${x+dx+1.1}" cy="${96+dy}" r="1" fill="#fff"/>`;
 const feliz=(x)=>`<path d="M${x-5} 98.5 Q${x} 93 ${x+5} 98.5" stroke="${iris}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
 const fechado=(x)=>`<path d="M${x-5} 97.5 Q${x} 100 ${x+5} 97.5" stroke="${iris}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
 const sob=(dl=0,dr=0,arq=2)=>`<path d="M81 ${88.5+dl} Q88 ${88.5+dl-arq} 95 ${88+dl} M105 ${88+dr} Q112 ${88.5+dr-arq} 119 ${88.5+dr}" stroke="#22150f" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
 if(r==="gargalhada")return feliz(88)+feliz(112)+sob(-2,-2,3)+`<path d="M88 111 Q100 128 112 111Z" fill="${boca}"/><path d="M89.5 111.6 Q100 114 110.5 111.6 L110 113.4 Q100 116 90 113.4Z" fill="#fff"/>`;
 if(r==="sereno")return fechado(88)+fechado(112)+sob(1,1,1)+`<path d="M93 115 Q100 118 107 115" stroke="${boca}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
 if(r==="piscada")return olho(88)+fechado(112)+sob(-3,1,2)+`<path d="M91 115 Q101 119 110 112" stroke="${boca}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
 if(r==="pensativo")return olho(88,1.4,-1.2)+olho(112,1.4,-1.2)+sob(2,-3,1)+`<path d="M94 116 L107 114" stroke="${boca}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
 return olho(88)+olho(112)+sob()+`<path d="M90 112 Q100 121 110 112" stroke="${boca}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}
function avatarSvg(s0){
 const s={...PADRAO,...(s0||{})};
 const id="a"+(++_id),pele=PELES[s.pele],cab=s.cabeloCor,sombra="rgba(0,0,0,.12)";
 const roupa=s.roupa==="branca"?"#ffffff":s.roupaCor;
 let defs=`<clipPath id="${id}c"><circle cx="100" cy="100" r="100"/></clipPath>`;
 if(s.roupa==="estampada")defs+=`<pattern id="${id}e" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${s.roupaCor}"/><path d="M0 18 L9 6 L18 18Z" fill="${s.estampaCor}"/><circle cx="9" cy="3" r="1.6" fill="${s.estampaCor}"/></pattern>`;
 defs+=`<pattern id="${id}b" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><circle cx="1.6" cy="1.6" r=".8" fill="${cab}" opacity=".9"/></pattern><clipPath id="${id}f"><ellipse cx="100" cy="94" rx="33" ry="38"/></clipPath>`;
 if(s.panoListrado)defs+=`<pattern id="${id}p" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><rect width="14" height="14" fill="${s.panoCor}"/><rect width="14" height="4" fill="${s.listra}"/></pattern>`;
 const rf=s.roupa==="estampada"?`url(#${id}e)`:roupa, pf=`url(#${id}p)`;
 let atras="",frente="",sobre="";const h=s.cabelo;
 const capa=(o=1)=>`<path d="M65 90 Q63 50 100 48 Q137 50 135 90 Q126 68 100 67 Q74 68 65 90Z" fill="${cab}" opacity="${o}"/>`;
 const cabelo=()=>{let a="",f="";
  if(h==="black")a=`<circle cx="100" cy="80" r="56" fill="${cab}"/>`;
  if(h==="cacheado"){a=[[56,92],[60,70],[72,52],[90,42],[110,42],[128,52],[140,70],[144,92],[60,110],[140,110]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="15" fill="${cab}"/>`).join("");f=[[70,74],[82,60],[100,55],[118,60],[130,74]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="11" fill="${cab}"/>`).join("");}
  if(h==="puffs")a=`<circle cx="66" cy="50" r="22" fill="${cab}"/><circle cx="134" cy="50" r="22" fill="${cab}"/>`;
  if(h==="trancas")a=`<circle cx="100" cy="78" r="46" fill="${cab}"/>`+[0,1,2,3].map(i=>`<rect x="${58+i*3}" y="80" width="7" height="${74-i*6}" rx="3.5" fill="${cab}"/><rect x="${135-i*3}" y="80" width="7" height="${74-i*6}" rx="3.5" fill="${cab}"/>`).join("");
  if(h==="dreads")a=`<circle cx="100" cy="76" r="44" fill="${cab}"/>`+[0,1,2,3,4].map(i=>`<rect x="${54+i*5}" y="74" width="10" height="${92-i*8}" rx="5" fill="${cab}" stroke="rgba(0,0,0,.18)" stroke-width="1"/><rect x="${136-i*5}" y="74" width="10" height="${92-i*8}" rx="5" fill="${cab}" stroke="rgba(0,0,0,.18)" stroke-width="1"/>`).join("");
  if(h==="longo")a=`<path d="M60 86 Q58 40 100 38 Q142 40 140 86 L144 156 Q100 166 56 156Z" fill="${cab}"/>`;
  if(h==="chanel")a=`<path d="M62 84 Q60 42 100 40 Q140 42 138 84 L140 124 Q128 130 118 124 L82 124 Q72 130 60 124Z" fill="${cab}"/>`;
  if(h==="coque")a=`<circle cx="100" cy="40" r="17" fill="${cab}"/>`;
  if(h==="rabo")a=`<path d="M128 56 Q160 70 156 120 Q150 150 140 160 Q148 120 132 80Z" fill="${cab}"/>`;
  const lados=capa(.45);
  if(h==="calvo"){a=`<path d="M66 110 Q60 86 70 70 Q76 70 76 76 Q68 92 73 110Z M134 110 Q140 86 130 70 Q124 70 124 76 Q132 92 127 110Z" fill="${cab}"/>`;}
  if(h==="topete")f=lados+`<path d="M68 78 Q62 46 90 34 Q118 24 134 46 Q138 60 132 74 Q126 56 104 58 Q84 60 68 78Z" fill="${cab}"/><path d="M84 46 Q104 34 126 44" stroke="rgba(255,255,255,.18)" stroke-width="2.5" fill="none"/>`;
  if(h==="encaracoladoM")f=lados+[[72,66,9],[80,54,10],[92,46,10],[106,44,10],[120,48,10],[130,58,9],[132,70,8],[88,58,9],[102,56,9],[116,60,9],[96,36,8],[112,36,8]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${cab}"/>`).join("")+[[86,50],[104,46],[120,54],[96,38]].map(([x,y])=>`<path d="M${x-4} ${y} q4 -5 8 0" stroke="rgba(255,255,255,.18)" stroke-width="1.6" fill="none"/>`).join("");
  if(h==="blackRaspado")f=lados+`<path d="M70 76 L69 40 Q70 18 100 18 Q130 18 131 40 L130 76 Q116 64 100 64 Q84 64 70 76Z" fill="${cab}"/>`;
  if(h==="crespoDegrade")f=lados+`<path d="M69 76 Q66 46 100 42 Q134 46 131 76 Q118 62 100 62 Q82 62 69 76Z" fill="${cab}"/>`+[[82,56],[92,50],[104,48],[116,52],[124,60],[88,62],[100,58],[112,60]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.2" fill="rgba(255,255,255,.14)"/>`).join("");
  if(h==="blackCurto")a=`<circle cx="100" cy="82" r="44" fill="${cab}"/>`;
  if(h==="blackCurto")f=`<path d="M65 92 Q63 58 100 56 Q137 58 135 92 Q124 76 100 75 Q76 76 65 92Z" fill="${cab}"/>`;
  if(h==="blackCurtoRaspado")f=lados+`<path d="M70 76 L70 52 Q72 34 100 33 Q128 34 130 52 L130 76 Q116 64 100 64 Q84 64 70 76Z" fill="${cab}"/>`;
  if(h==="cacheadoBaguncado"){a=`<path d="M58 102 Q50 60 76 44 Q100 34 124 44 Q150 60 142 102 L134 102 Q132 86 126 80 L74 80 Q68 86 66 102Z" fill="${cab}"/>`;
   f=[[66,80,10],[68,66,11],[78,54,12],[92,47,12],[108,46,12],[122,52,12],[132,64,11],[134,80,10],[84,66,10],[98,60,11],[114,62,10],[126,72,8],[90,74,7],[104,72,8],[118,76,6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${cab}"/>`).join("")
    +`<path d="M98 72 q-6 6 -2 12 M108 70 q6 5 2 11" stroke="${cab}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    +[[80,52],[96,46],[112,46],[124,54],[90,64],[106,60],[70,68],[130,66]].map(([x,y])=>`<path d="M${x-4} ${y} q4 -5 8 0" stroke="rgba(255,255,255,.18)" stroke-width="1.6" fill="none"/>`).join("");}
  if(h==="cacheadoMedio"){a=`<path d="M63 96 Q58 58 80 46 Q100 36 120 46 Q142 58 137 96 L131 96 Q130 82 124 78 L76 78 Q70 82 69 96Z" fill="${cab}"/>`;
   f=[[72,70,9],[80,58,10],[92,50,10],[106,48,10],[118,52,10],[128,62,9],[130,74,8],[88,64,8],[102,60,9],[116,64,8]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${cab}"/>`).join("")
    +[[88,52],[104,50],[120,58],[96,62]].map(([x,y])=>`<path d="M${x-4} ${y} q4 -5 8 0" stroke="rgba(255,255,255,.18)" stroke-width="1.6" fill="none"/>`).join("");}
  if(h==="texturizado")f=`<path d="M65 92 Q62 50 100 44 Q138 48 135 90 Q132 72 124 70 Q118 78 110 70 Q102 80 94 70 Q86 80 78 72 Q70 78 65 92Z" fill="${cab}"/><path d="M80 52 Q96 44 118 50 M76 62 Q94 54 124 60" stroke="rgba(255,255,255,.16)" stroke-width="2" fill="none"/>`;
  if(h==="social")f=`<path d="M65 90 Q63 50 100 46 Q137 50 135 90 Q132 66 112 62 Q94 62 84 56 Q72 66 65 90Z" fill="${cab}"/><path d="M84 56 Q80 50 82 46" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/><path d="M90 56 Q110 50 128 62" stroke="rgba(255,255,255,.15)" stroke-width="2" fill="none"/>`;
  if(h==="undercut")f=lados+`<path d="M70 74 Q66 42 100 36 Q134 42 130 74 Q118 60 100 60 Q82 60 70 74Z" fill="${cab}"/><path d="M80 62 Q90 44 112 40 M92 62 Q102 46 124 46 M106 60 Q116 52 128 56" stroke="rgba(255,255,255,.16)" stroke-width="2" fill="none"/>`;
  if(h==="lisoCurto")a=`<path d="M64 88 Q60 46 100 42 Q140 46 136 88 L137 112 Q132 114 128 110 L128 84 L72 84 L72 110 Q68 114 63 112Z" fill="${cab}"/>`;
  if(h==="franja")a=`<path d="M62 86 Q60 44 100 42 Q140 44 138 86 L139 116 Q130 120 124 114 L76 114 Q70 120 61 116Z" fill="${cab}"/>`;
  if(h==="onduladoCurto")a=`<path d="M62 88 Q58 44 100 40 Q142 44 138 88 Q146 98 138 106 Q146 114 134 120 Q128 112 128 100 L72 100 Q72 112 66 120 Q54 114 62 106 Q54 98 62 88Z" fill="${cab}"/>`;
  if(h==="onduladoLongo")a=`<path d="M60 86 Q56 40 100 38 Q144 40 140 86 Q150 100 140 114 Q150 128 140 142 Q148 154 136 162 L64 162 Q52 154 60 142 Q50 128 60 114 Q50 100 60 86Z" fill="${cab}"/>`;
  if(h==="cachosCurto")a=[[62,84],[66,64],[78,50],[94,42],[110,42],[124,50],[136,64],[140,84],[60,104],[142,104]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="11" fill="${cab}"/>`).join("");
  if(h==="cachosLongo")a=[[62,80],[66,60],[80,46],[100,40],[120,46],[134,60],[138,80],[58,100],[142,100],[56,120],[144,120],[58,140],[142,140],[64,158],[136,158]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13" fill="${cab}"/>`).join("");
  if(h==="lisoCurto")f=`<path d="M64 92 Q62 50 100 46 Q140 48 136 90 Q130 68 108 62 Q88 74 64 92Z" fill="${cab}"/>`;
  if(h==="franja")f=`<path d="M66 84 Q66 50 100 48 Q134 50 134 84 Q100 76 66 84Z" fill="${cab}"/>`;
  if(h==="onduladoCurto"||h==="onduladoLongo")f=`<path d="M64 90 Q62 50 100 46 Q138 50 136 90 Q128 70 112 66 Q100 78 88 66 Q72 70 64 90Z" fill="${cab}"/>`;
  if(h==="cachosCurto"||h==="cachosLongo")f=[[72,68],[86,56],[100,52],[114,56],[128,68]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9" fill="${cab}"/>`).join("");
  if(["curto","coque","longo","trancas","dreads","puffs","rabo"].includes(h))f=capa();
  if(h==="nago")f=capa()+[-18,-9,0,9,18].map(d=>`<path d="M${100+d} 50 Q${100+d*1.3} 62 ${100+d*1.8} 72" stroke="rgba(255,255,255,.22)" stroke-width="2" fill="none"/>`).join("");
  if(h==="raspado")f=capa(.55);
  if(h==="moicano")f=capa(.35)+`<path d="M90 70 Q88 30 100 22 Q112 30 110 70Z" fill="${cab}"/>`;
  if(h==="black")f=`<path d="M64 92 Q62 56 100 54 Q138 56 136 92 Q124 74 100 73 Q76 74 64 92Z" fill="${cab}"/>`;
  if(h==="chanel")f=`<path d="M66 90 Q66 52 100 50 Q134 52 134 90 Q118 76 100 78 Q80 76 66 90Z" fill="${cab}"/>`;
  return [a,f];};
 const P=s.pano, pp=s.panoListrado&&P!=="croche"?pf:s.panoCor;
 if(!P){[atras,frente]=cabelo();}
 if(P==="oja")sobre=`<path d="M63 90 Q58 46 100 42 Q142 46 137 90 Q124 74 100 74 Q76 74 63 90Z" fill="${pp}"/><path d="M64 84 Q100 62 136 84" stroke="rgba(0,0,0,.18)" stroke-width="2" fill="none"/><path d="M66 70 Q100 50 134 70" stroke="rgba(0,0,0,.12)" stroke-width="2" fill="none"/><g stroke="${sombra}" stroke-width="1.5"><path d="M100 46 Q72 18 66 40 Q70 58 100 48Z" fill="${pp}"/><path d="M100 46 Q128 18 134 40 Q130 58 100 48Z" fill="${pp}"/><ellipse cx="100" cy="47" rx="9" ry="8" fill="${pp}"/></g><path d="M80 32 Q74 38 78 46 M120 32 Q126 38 122 46" stroke="rgba(0,0,0,.15)" stroke-width="2" fill="none"/>`;
 if(P==="touca")sobre=`<path d="M63 92 Q58 42 100 38 Q142 42 137 92 Q124 76 100 76 Q76 76 63 92Z" fill="${pp}"/><path d="M78 50 Q100 40 122 50" stroke="rgba(255,255,255,.35)" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M61 88 Q100 64 139 88 Q140 96 136 98 Q100 76 64 98 Q60 96 61 88Z" fill="${pp}" stroke="rgba(0,0,0,.22)" stroke-width="1.4"/><path d="M70 86 Q100 70 130 86" stroke="rgba(0,0,0,.14)" stroke-width="1.5" fill="none"/><path d="M136 90 Q148 92 146 104 Q140 100 134 98Z" fill="${pp}" stroke="rgba(0,0,0,.22)" stroke-width="1.2"/>`;
 if(P==="turbante")sobre=`<path d="M60 92 Q50 30 100 10 Q150 30 140 92 Q124 72 100 73 Q76 72 60 92Z" fill="${pp}"/><path d="M64 74 Q96 34 138 50 M62 60 Q100 20 132 32 M70 44 Q100 10 124 20" stroke="rgba(0,0,0,.18)" stroke-width="2" fill="none"/><path d="M98 14 Q120 4 132 22 Q118 30 98 14Z" fill="${pp}" stroke="${sombra}" stroke-width="1.5"/>`;
 if(P==="croche"){defs+=`<pattern id="${id}r" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${s.panoCor}"/><circle cx="6" cy="6" r="3" fill="${pele}" opacity=".55"/><circle cx="0" cy="0" r="1.4" fill="${pele}" opacity=".55"/><circle cx="12" cy="0" r="1.4" fill="${pele}" opacity=".55"/><circle cx="0" cy="12" r="1.4" fill="${pele}" opacity=".55"/><circle cx="12" cy="12" r="1.4" fill="${pele}" opacity=".55"/><path d="M6 0 v3 M6 9 v3 M0 6 h3 M9 6 h3" stroke="rgba(0,0,0,.12)" stroke-width=".8"/></pattern>`;
  const bicos=Array.from({length:9},(_,i)=>{const t=i/8,x=64+72*t,y=90-26*Math.sin(t*Math.PI)*0.62;return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" fill="${s.panoCor}" stroke="rgba(0,0,0,.12)" stroke-width=".8"/><circle cx="${x.toFixed(1)}" cy="${(y+1).toFixed(1)}" r="1.8" fill="${pele}" opacity=".6"/>`}).join("");
  sobre=`<path d="M63 90 Q58 42 100 38 Q142 42 137 90 Q124 76 100 76 Q76 76 63 90Z" fill="url(#${id}r)" stroke="rgba(0,0,0,.1)" stroke-width="1"/>`+bicos+`<circle cx="100" cy="40" r="4" fill="${s.panoCor}"/>`;}
 const BC=cab;
 const bigode=`<path d="M86 111 Q93 104 100 108 Q107 104 114 111 Q107 109 100 111 Q93 109 86 111Z" fill="${BC}"/>`;
 const cava=`<path d="M90 119 Q91 135 100 137 Q109 135 110 119 Q105 123 100 123 Q95 123 90 119Z" fill="${BC}"/>`;
 const cheia=`<path d="M70 98 Q72 136 100 140 Q128 136 130 98 Q126 120 112 122 Q100 118 88 122 Q74 120 70 98Z" fill="${BC}"/>`;
 const labios=`<ellipse cx="100" cy="115.5" rx="11.5" ry="5.8" fill="${pele}"/>`;
 const barba=({"cheia":cheia+labios+bigode,"curta":`<g fill="url(#${id}b)" clip-path="url(#${id}f)">${cheia.replace(/fill="[^"]*"/,"")}${bigode.replace(/fill="[^"]*"/,"")}</g>`+labios,"longa":`<path d="M70 98 Q70 160 100 166 Q130 160 130 98 Q126 120 112 122 Q100 118 88 122 Q74 120 70 98Z" fill="${BC}"/>`+labios+bigode,"cavanhaque":cava+labios+bigode,"bigode":bigode,"cavanhaqueSo":cava+labios})[s.barba]||"";
 const OC="#2a1d16";
 const oculos=({redondo:`<g fill="none" stroke="${OC}" stroke-width="2.4"><circle cx="88" cy="97" r="8.5"/><circle cx="112" cy="97" r="8.5"/><path d="M96.5 96 Q100 93.5 103.5 96 M79.5 95 L67 92 M120.5 95 L133 92"/></g>`,
  quadrado:`<g fill="none" stroke="${OC}" stroke-width="2.8"><rect x="78" y="90" width="19" height="14" rx="3"/><rect x="103" y="90" width="19" height="14" rx="3"/><path d="M97 95 h6 M78 94 L67 92 M122 94 L133 92"/></g>`,
  sol:`<g><path d="M77 91 h21 v6 q0 9 -10 9 q-11 0 -11 -9Z M102 91 h21 v6 q0 9 -11 9 q-10 0 -10 -9Z" fill="#1d1a18" stroke="${OC}" stroke-width="1.6"/><path d="M98 93 h4 M77 93 L67 91 M123 93 L133 91" stroke="${OC}" stroke-width="2.4"/><path d="M81 94 l5 0" stroke="rgba(255,255,255,.35)" stroke-width="2" stroke-linecap="round"/></g>`})[s.oculos]||"";
 const bx={esq:[67],dir:[133],ambos:[67,133]}[s.brincoLado||"ambos"];
 const brinco=s.brinco?bx.map(x=>({argola:`<circle cx="${x}" cy="110" r="5" fill="none" stroke="#e3a948" stroke-width="2.4"/>`,
  ponto:`<circle cx="${x}" cy="105" r="2.4" fill="#e9e9ef" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>`,
  buzio:`<path d="M${x} 104 v4" stroke="#c9a46a" stroke-width="1.4"/><ellipse cx="${x}" cy="113" rx="3.6" ry="5.2" fill="#f4ecdc" stroke="#b9a37f" stroke-width="1"/><path d="M${x} 109.5 v7" stroke="#b9a37f" stroke-width="1"/>`})[s.brinco]).join(""):"";
 const cs=[s.conta1,s.conta2||s.conta1];
 const contas=s.semContas?"":Array.from({length:11},(_,i)=>{const t=i/10,x=76+48*t,y=150+44*t*(1-t);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${cs[i%2]}" stroke="rgba(0,0,0,.18)" stroke-width=".6"/>`}).join("");
 return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar"><defs>${defs}</defs><g clip-path="url(#${id}c)"><rect width="200" height="200" fill="${s.fundo}"/>${atras}<path d="M28 205 Q30 150 100 144 Q170 150 172 205Z" fill="${rf}" stroke="${sombra}" stroke-width="1.5"/><rect x="88" y="118" width="24" height="30" rx="10" fill="${pele}"/><path d="M88 140 Q100 152 112 140" fill="none" stroke="${sombra}" stroke-width="2"/><ellipse cx="100" cy="94" rx="33" ry="38" fill="${pele}"/><ellipse cx="67" cy="98" rx="5" ry="8" fill="${pele}"/><ellipse cx="133" cy="98" rx="5" ry="8" fill="${pele}"/>${barba}${frente}${sobre}${rosto(s.rosto)}${oculos}${brinco}${contas}</g></svg>`;
}

export { PELES, CAB_COR, CORES, FUNDOS, CABELOS, PANOS, OCULOS, BRINCOS, BARBAS, ROSTOS, ROUPAS, PADRAO, SELO_ROSTO, CAPAS, avatarSvg };
