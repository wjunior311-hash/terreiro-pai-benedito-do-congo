import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Home, CalendarDays, Leaf, UserRound, WalletCards, BookOpen, Settings, UsersRound, ClipboardList, Megaphone, ArrowRight, Clock3, Check, X, Plus, ChevronRight, CircleDollarSign } from 'lucide-react'
import './styles.css'

const gira = { title:'Gira de Caboclos', date:'20 de setembro', time:'19h', bring:'Vela branca e roupa clara', contribution:'R$ 20' }
const periods = ['Sexta-feira','Sábado · 14h30–15h30','Sábado · pós-gira','Domingo']
const tasks = [
 ['Organizar geladeira','Sexta-feira','Organização',1],['Organizar e limpar cozinha','Sexta-feira','Cozinha',2],['Verificar afazeres da decoração','Sexta-feira','Decoração',3],['Arrumar lavanderia','Sexta-feira','Organização',1],['Verificar necessidade de lona','Sexta-feira','Manutenção',3],
 ['Conferir descartáveis e lixeiras','Sábado · 14h30–15h30','Organização',2],['Arrumar banheiro','Sábado · 14h30–15h30','Organização',1],['Colocar e limpar cadeiras e bancos','Sábado · 14h30–15h30','Organização',3],['Padês e quartinhas','Sábado · 14h30–15h30','Cozinha',2],['Organização dos itens da gira','Sábado · 14h30–15h30','Organização',2],['Firmeza da casa','Sábado · 14h30–15h30','Iniciados',2],['Preparo da defumação','Sábado · 14h30–15h30','Organização',1],['Apoio na chegada','Sábado · 14h30–15h30','Organização',2],
 ['Retirar itens sujos e separar por categoria','Sábado · pós-gira','Organização',2],['Lavar alguidares','Sábado · pós-gira','Organização',2],['Lavar louça','Sábado · pós-gira','Cozinha',2],['Varrer quintal','Sábado · pós-gira','Organização',2],['Varrer parte de cima','Sábado · pós-gira','Organização',2],['Varrer cozinha','Sábado · pós-gira','Cozinha',1],['Lavar banheiro','Sábado · pós-gira','Organização',1],['Retirar decoração','Sábado · pós-gira','Decoração',3],['Organizar decoração para guardar','Sábado · pós-gira','Decoração',3],['Organização dos espaços e guardar itens fora do lugar','Domingo','Organização',5]
]

const nav = [
 {id:'home',label:'Início',icon:Home},{id:'giras',label:'Giras',icon:CalendarDays},{id:'community',label:'Comunidade',icon:Leaf},{id:'me',label:'Eu',icon:UserRound}
]

function App(){
 const [screen,setScreen]=useState('home'); const [presence,setPresence]=useState(null); const [postOpen,setPostOpen]=useState(false)
 const go=id=>setScreen(id)
 return <div className="app-shell">
  <header className="topbar"><div className="brand-mark">PBC</div><div><span className="eyebrow">Terreiro Pai Benedito do Congo</span><strong>Axé, comunidade.</strong></div></header>
  <main className="content">
   {screen==='home'&&<HomeScreen go={go} presence={presence} setPresence={setPresence}/>} 
   {screen==='giras'&&<GirasScreen/>}
   {screen==='community'&&<CommunityScreen open={postOpen} setOpen={setPostOpen}/>} 
   {screen==='me'&&<MeScreen go={go}/>} 
   {screen==='admin'&&<AdminScreen go={go}/>} 
  </main>
  <footer className="birthday-bar"><span>🎂</span><div><strong>Aniversariantes de setembro</strong><small>Ana 03/09 · João 17/09 · Wagner 31/03</small></div></footer>
  <nav className="bottom-nav">{nav.map(({id,label,icon:Icon})=><button key={id} className={screen===id?'active':''} onClick={()=>go(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
 </div>
}

function HomeScreen({go,presence,setPresence}){return <>
 <section className="hero"><span className="eyebrow">Boa tarde, Wagner</span><h1>Que a casa esteja<br/><em>em harmonia.</em></h1><p className="muted">Tudo que você precisa para acompanhar a vida da casa, em um só lugar.</p></section>
 <section className="gira-card featured"><div className="gira-art"><span>🌿</span></div><div className="gira-info"><span className="pill">PRÓXIMA GIRA</span><h2>{gira.title}</h2><p className="date"><CalendarDays size={15}/> Sábado, {gira.date} · {gira.time}</p><p className="muted small">Levar: {gira.bring}</p><button className="text-button" onClick={()=>go('giras')}>Ver detalhes <ArrowRight size={16}/></button></div></section>
 <section className="presence-card"><strong>Você vai participar?</strong><span>Confirme sua presença para a próxima gira.</span><div className="choice-row"><button className={presence==='yes'?'selected':''} onClick={()=>setPresence('yes')}><Check size={15}/> Vou participar</button><button className={presence==='no'?'selected no':''} onClick={()=>setPresence('no')}><X size={15}/> Não vou</button></div>{presence&&<small className="saved">Resposta registrada nesta demonstração.</small>}</section>
 <section className="notice"><div className="notice-icon"><Megaphone size={18}/></div><div><span className="eyebrow">AVISO DA CASA</span><p>Quem puder chegar um pouco antes neste sábado, teremos organização da cozinha.</p></div></section>
 <div className="shortcut-grid"><Shortcut icon={<CalendarDays/>} title="Giras" onClick={()=>go('giras')}/><Shortcut icon={<Leaf/>} title="Comunidade" onClick={()=>go('community')}/><Shortcut icon={<WalletCards/>} title="Financeiro" onClick={()=>go('me')}/><Shortcut icon={<BookOpen/>} title="Informações da casa" onClick={()=>go('me')}/></div>
 </>}
function Shortcut({icon,title,onClick}){return <button className="shortcut" onClick={onClick}>{icon}<span>{title}</span></button>}

function GirasScreen(){return <section><PageTitle eyebrow="CALENDÁRIO DA CASA" title="Giras" subtitle="Próximas e anteriores, sempre em cartões simples."/><GiraDetail/><h3 className="section-title">Outubro</h3><GiraItem title="Gira de Erês" date="04 out · 15h" contribution="R$ 15"/><h3 className="section-title">Depois da gira</h3><div className="memory-card"><strong>O que ficou dessa gira?</strong><p className="muted">Depois da gira, este espaço reúne as reflexões e memórias compartilhadas pela comunidade.</p></div></section>}
function GiraDetail(){const [help,setHelp]=useState([]);return <article className="gira-detail gira-card"><div className="gira-art detail-art"><span>🌾</span></div><div className="gira-info"><span className="pill">SETEMBRO · PRÓXIMA</span><h2>{gira.title}</h2><p className="date"><CalendarDays size={15}/> {gira.date} · {gira.time}</p><p className="muted small">Levar: {gira.bring}</p><p className="contribution">Contribuição <strong>{gira.contribution}</strong></p><div className="presence-block"><strong>Quero ajudar</strong><div className="periods">{periods.map(p=><button key={p} className={help.includes(p)?'selected':''} onClick={()=>setHelp(h=>h.includes(p)?h.filter(x=>x!==p):[...h,p])}>{p}</button>)}</div></div></div></article>}
function GiraItem({title,date,contribution}){return <article className="gira-card compact"><div className="gira-art small-art">🌱</div><div className="gira-info"><span className="pill">GIRA</span><h2>{title}</h2><p className="date"><Clock3 size={15}/>{date}</p><p className="muted small">Contribuição: {contribution}</p></div><ChevronRight className="chevron" size={19}/></article>}

function CommunityScreen({open,setOpen}){return <section><PageTitle eyebrow="NOSSA COMUNIDADE" title="Mural" subtitle="Ensinamentos, reflexões e o que ficou de cada gira."/><button className="primary-button" onClick={()=>setOpen(true)}><Plus size={17}/> Compartilhar algo com a casa</button><div className="post-list"><Post avatar="🪶" name="Maria" orixa="Caboclo" text="Saí da gira de ontem com uma sensação muito bonita de acolhimento. Queria deixar registrado aqui." meta="Ontem · Gira de Caboclos"/><Post avatar="🌻" name="João" orixa="Oxum" text="Uma lembrança para quem chega: cada um tem seu tempo dentro da casa." meta="12 set"/></div>{open&&<Modal title="Compartilhar com a casa" onClose={()=>setOpen(false)}><textarea placeholder="O que você quer deixar registrado?" autoFocus/><button className="primary-button" onClick={()=>setOpen(false)}>Publicar</button></Modal>}</section>}
function Post({avatar,name,orixa,text,meta}){return <article className="post"><div className="avatar">{avatar}</div><div><strong>{name}</strong><span className="post-meta"> · {orixa}</span><p>{text}</p><small>{meta}</small></div></article>}

function MeScreen({go}){return <section><PageTitle eyebrow="SEU ESPAÇO" title="Eu" subtitle="Seu perfil, registros e informações importantes."/><div className="profile-card"><div className="avatar large">🌻</div><div><h2>Wagner Marinho</h2><p className="muted">Oxum · Comunicação</p></div></div><div className="menu-card"><MenuRow icon={<WalletCards/>} title="Meu financeiro" detail="Mensalidade e outras cobranças"/><MenuRow icon={<BookOpen/>} title="Informações da casa" detail="Regras e orientações"/><MenuRow icon={<UserRound/>} title="Meu perfil" detail="Dados e símbolo de Orixá"/><MenuRow icon={<Settings/>} title="Configurações" detail="Preferências da conta"/></div><button className="admin-link" onClick={()=>go('admin')}><UsersRound size={17}/> Administração <ChevronRight size={17}/></button><button className="logout"><LogOutIcon/> Sair</button></section>}
function LogOutIcon(){return <LogOut/>}
function MenuRow({icon,title,detail}){return <button className="menu-row">{icon}<div><strong>{title}</strong><small>{detail}</small></div><ChevronRight size={17}/></button>}

function AdminScreen({go}){return <section><PageTitle eyebrow="ADMINISTRAÇÃO" title="Gestão da casa" subtitle="Área restrita aos administradores."/><div className="admin-grid"><AdminCard icon={<UsersRound/>} title="Pessoas" detail="Perfis, grupos e lideranças"/><AdminCard icon={<CalendarDays/>} title="Giras" detail="Criar, editar e publicar"/><AdminCard icon={<ClipboardList/>} title="Tarefas" detail="Sortear e reatribuir"/><AdminCard icon={<CircleDollarSign/>} title="Financeiro" detail="Mensalidades e cobranças"/><AdminCard icon={<Leaf/>} title="Comunidade" detail="Moderar publicações"/><AdminCard icon={<BookOpen/>} title="Conteúdos" detail="Regras e informações"/><AdminCard icon={<MailIcon/>} title="Convites" detail="Membro, editor ou admin"/></div><section className="task-panel"><div className="panel-head"><div><span className="eyebrow">ORGANIZAÇÃO · PRÓXIMA GIRA</span><h2>Distribuição de tarefas</h2></div><button className="draw-button">🎲 Sortear tarefas</button></div><div className="task-summary"><span>48 vagas comuns</span><span>4 períodos</span><span>Iniciados: elegibilidade exclusiva</span></div>{periods.map(p=><div className="period-card" key={p}><strong>{p}</strong><span>{tasks.filter(t=>t[1]===p).reduce((a,t)=>a+t[3],0)} vagas configuradas</span></div>)}</section></section>}
function MailIcon(){return <span className="mail-icon">✉</span>}
function AdminCard({icon,title,detail}){return <button className="admin-card">{icon}<strong>{title}</strong><small>{detail}</small><ChevronRight size={16}/></button>}
function PageTitle({eyebrow,title,subtitle}){return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p className="muted">{subtitle}</p></div>}
function Modal({title,onClose,children}){return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={onClose}><X/></button></div>{children}</div></div>}

createRoot(document.getElementById('root')).render(<App/>);