from pathlib import Path
import re

path = Path('src/main.jsx')
s = path.read_text(encoding='utf-8')

old_import = "import {supabase} from './lib/supabase'"
new_import = "import {supabase} from './lib/supabase'"
if old_import not in s:
    raise SystemExit('supabase import marker not found')

new_auth = r'''function Auth(){
 const [mode,setMode]=useState('login'),[code,setCode]=useState(''),[role,setRole]=useState(null),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[dateOfBirth,setDateOfBirth]=useState(''),[orixaSymbol,setOrixaSymbol]=useState(''),[groupName,setGroupName]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false)
 const orixas=[['⚪','Oxalá'],['⚔️','Ogum'],['💛','Oxum'],['🌊','Iemanjá'],['⚡','Xangô'],['🌪️','Iansã'],['🏹','Oxóssi'],['🪻','Nanã'],['🌾','Obaluaiê'],['🦋','Logunedé'],['🔥','Exu'],['🌿','Ossain'],['🌙','Ewá'],['🪨','Obá']]
 const validate=async()=>{const {data,error}=await supabase.rpc('validate_invitation',{p_code:code.trim()});if(error||!data?.length){setRole(null);setMsg('Código inválido, usado, revogado ou expirado.');return}setRole(data[0]);if(data[0].intended_name)setName(data[0].intended_name);if(data[0].intended_email)setEmail(data[0].intended_email);setMsg('Convite válido.')}
 const submit=async e=>{e.preventDefault();setMsg('');setBusy(true);try{if(mode==='register'){if(!role){await validate();return}if(!dateOfBirth||!orixaSymbol||!groupName){setMsg('Preencha data de nascimento, Orixá e grupo de atuação.');return}const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:'https://wjunior311-hash.github.io/terreiro-pai-benedito-do-congo/',data:{name,invite_code:code.trim(),date_of_birth:dateOfBirth,orixa_symbol:orixaSymbol,group_name:groupName}}});if(error)throw error;setMsg('Conta criada. Confira seu e-mail para confirmar o acesso.')}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}}catch(e){setMsg(e.message||'Não foi possível concluir.')}finally{setBusy(false)}}
 return <div className="auth"><div className="card"><div className="row"><div className="logo">PBC</div><span className="eyebrow">Terreiro Pai Benedito do Congo</span></div><h1>{mode==='login'?'Bem-vindo de volta.':'Entre para a casa.'}</h1><p className="muted">{mode==='login'?'Acesse sua área da comunidade.':'Use o código recebido para criar seu acesso.'}</p>{msg&&<div className="toast">{msg}</div>}<form onSubmit={submit}>{mode==='register'&&<><div className="field"><label>Nome</label><input className="input" value={name} onChange={e=>setName(e.target.value)} required/></div><div className="field"><label>Código de convite</label><div className="row"><input className="input" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="PBC-XXXXXXXXXXXX" required/><button className="btn" type="button" onClick={validate}>Validar</button></div></div>{role&&<div className="toast"><ShieldCheck size={15}/> Convite para <b>{role.role==='admin'?'Administrador':role.role==='editor'?'Editor':'Membro'}</b></div>}<div className="field"><label>Data de nascimento</label><input className="input" type="date" value={dateOfBirth} onChange={e=>setDateOfBirth(e.target.value)} required/></div><div className="field"><label>Seu Orixá</label><select className="select" value={orixaSymbol} onChange={e=>setOrixaSymbol(e.target.value)} required><option value="">Escolha seu Orixá</option>{orixas.map(([icon,label])=><option key={label} value={icon}>{icon} {label}</option>)}</select></div><div className="field"><label>Grupo de atuação</label><select className="select" value={groupName} onChange={e=>setGroupName(e.target.value)} required><option value="">Escolha seu grupo</option><option>Decoração</option><option>Cozinha</option><option>Comunicação</option><option>Manutenção</option><option>Ainda não estou em nenhum grupo</option></select><small className="muted">Se ainda não estiver em um grupo, sua atuação operacional será considerada Organização.</small></div></>}<div className="field"><label>E-mail</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field"><label>Senha</label><input className="input" type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} required/></div><button className="btn primary" style={{width:'100%'}} disabled={busy}>{busy?'Aguarde…':mode==='login'?'Entrar':'Criar minha conta'}</button></form><button className="btn" style={{width:'100%',marginTop:8}} onClick={()=>{setMode(mode==='login'?'register':'login');setMsg('');setRole(null)}}>{mode==='login'?'Tenho um código de convite':'Já tenho uma conta'}</button></div></div>
}
function HomeScreen'''

pattern = re.compile(r'function Auth\(\)\{.*?\nfunction HomeScreen', re.S)
s2, n = pattern.subn(new_auth, s, count=1)
if n != 1:
    raise SystemExit(f'Auth replacement count={n}')
path.write_text(s2, encoding='utf-8')
print('Updated signup with DOB, Orixa icon, group, and production email redirect.')
