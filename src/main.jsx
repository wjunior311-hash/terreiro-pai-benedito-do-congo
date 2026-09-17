import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, Home, Leaf, UserRound, WalletCards, BookOpen, Settings, LogOut, UsersRound, ClipboardList, Megaphone, ArrowRight, Clock3 } from 'lucide-react'
import './styles.css'

const nav = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'giras', label: 'Giras', icon: CalendarDays },
  { id: 'community', label: 'Comunidade', icon: Leaf },
  { id: 'me', label: 'Eu', icon: UserRound },
]

function App() {
  const [screen, setScreen] = useState('home')

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">PBC</div>
        <div>
          <div className="eyebrow">Terreiro Pai Benedito do Congo</div>
          <strong>Axé, comunidade.</strong>
        </div>
      </header>

      <main className="content">
        {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
        {screen === 'giras' && <GirasScreen />}
        {screen === 'community' && <CommunityScreen />}
        {screen === 'me' && <MeScreen />}
      </main>

      <footer className="birthday-bar">
        <span>🎂</span>
        <div><strong>Aniversariantes de setembro</strong><br /><small>Ana 03/09 · João 17/09 · Wagner 31/09</small></div>
      </footer>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {nav.map(({ id, label, icon: Icon }) => (
          <button key={id} className={screen === id ? 'active' : ''} onClick={() => setScreen(id)}>
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function HomeScreen({ onNavigate }) {
  return <>
    <section className="hero">
      <p className="eyebrow">Boa tarde, Wagner</p>
      <h1>Que a casa esteja<br /><em>em harmonia.</em></h1>
      <p className="muted">Tudo que você precisa para acompanhar a vida da casa, em um só lugar.</p>
    </section>

    <section className="gira-card featured">
      <div className="gira-art"><span>🌿</span></div>
      <div className="gira-info">
        <span className="pill">PRÓXIMA GIRA</span>
        <h2>Gira de Caboclos</h2>
        <p className="date">Sábado, 20 de setembro · 19h</p>
        <p className="muted small">Levar: vela branca e roupa clara</p>
        <button className="text-button" onClick={() => onNavigate('giras')}>Ver detalhes <ArrowRight size={16} /></button>
      </div>
    </section>

    <section className="presence-card">
      <div><strong>Você vai participar?</strong><span>Confirme sua presença para a próxima gira.</span></div>
      <div className="choice-row"><button>✓ Vou participar</button><button>Não vou</button></div>
    </section>

    <section className="notice">
      <div className="notice-icon"><Megaphone size={18} /></div>
      <div><span className="eyebrow">AVISO DA CASA</span><p>Quem puder chegar um pouco antes neste sábado, teremos organização da cozinha.</p></div>
    </section>

    <div className="shortcut-grid">
      <Shortcut icon={<CalendarDays />} title="Giras" onClick={() => onNavigate('giras')} />
      <Shortcut icon={<Leaf />} title="Comunidade" onClick={() => onNavigate('community')} />
      <Shortcut icon={<WalletCards />} title="Financeiro" onClick={() => onNavigate('me')} />
      <Shortcut icon={<BookOpen />} title="Informações da casa" onClick={() => onNavigate('me')} />
    </div>
  </>
}

function Shortcut({ icon, title, onClick }) { return <button className="shortcut" onClick={onClick}>{icon}<span>{title}</span></button> }

function GirasScreen() {
  return <section>
    <PageTitle eyebrow="CALENDÁRIO DA CASA" title="Giras" subtitle="Acompanhe as próximas giras e organize sua participação." />
    <h3 className="section-title">Setembro</h3>
    <div className="gira-list">
      <GiraItem title="Gira de Caboclos" date="20 set · 19h" contribution="Contribuição: R$ 20" />
      <GiraItem title="Gira de Pretos-Velhos" date="27 set · 19h" contribution="Contribuição: R$ 20" />
    </div>
    <h3 className="section-title">Outubro</h3>
    <GiraItem title="Gira de Erês" date="04 out · 15h" contribution="Contribuição: R$ 15" />
  </section>
}

function GiraItem({ title, date, contribution }) { return <article className="gira-card compact"><div className="gira-art small-art">🌾</div><div className="gira-info"><span className="pill">GIRA</span><h2>{title}</h2><p className="date"><Clock3 size={15} /> {date}</p><p className="muted small">{contribution}</p></div><ArrowRight className="chevron" size={19} /></article> }

function CommunityScreen() {
  return <section>
    <PageTitle eyebrow="NOSSA COMUNIDADE" title="Mural" subtitle="Ensinamentos, reflexões e o que ficou de cada gira." />
    <button className="primary-button">+ Compartilhar algo com a casa</button>
    <div className="post-list">
      <article className="post"><div className="avatar">🪶</div><div><strong>Maria</strong><span className="post-meta"> · Caboclo</span><p>Saí da gira de ontem com uma sensação muito bonita de acolhimento. Queria deixar registrado aqui.</p><small>Ontem · Gira de Caboclos</small></div></article>
      <article className="post"><div className="avatar">🌻</div><div><strong>João</strong><span className="post-meta"> · Oxum</span><p>Uma lembrança para quem chega: cada um tem seu tempo dentro da casa.</p><small>12 set</small></div></article>
    </div>
  </section>
}

function MeScreen() {
  return <section>
    <PageTitle eyebrow="SEU ESPAÇO" title="Eu" subtitle="Seu perfil, seus registros e informações importantes." />
    <div className="profile-card"><div className="avatar large">🌻</div><div><h2>Wagner Marinho</h2><p className="muted">Oxum · Comunicação</p></div></div>
    <div className="menu-card">
      <MenuRow icon={<WalletCards />} title="Meu financeiro" detail="Mensalidade e outras cobranças" />
      <MenuRow icon={<BookOpen />} title="Informações da casa" detail="Regras e orientações" />
      <MenuRow icon={<UserRound />} title="Meu perfil" detail="Dados e símbolo de Orixá" />
      <MenuRow icon={<Settings />} title="Configurações" detail="Preferências da conta" />
      <MenuRow icon={<LogOut />} title="Sair" />
    </div>
    <div className="admin-link"><UsersRound size={17} /> Administração <span>›</span></div>
  </section>
}

function MenuRow({ icon, title, detail }) { return <button className="menu-row">{icon}<div><strong>{title}</strong>{detail && <small>{detail}</small>}</div><ArrowRight size={17} /></button> }
function PageTitle({ eyebrow, title, subtitle }) { return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p className="muted">{subtitle}</p></div> }

createRoot(document.getElementById('root')).render(<App />)
