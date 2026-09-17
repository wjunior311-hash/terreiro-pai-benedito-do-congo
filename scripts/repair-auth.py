from pathlib import Path

path = Path('src/main.jsx')
source = path.read_text(encoding='utf-8')
start = source.index('function AuthScreen()')
end = source.index('\nfunction HomeScreen', start)

replacement = r'''function AuthScreen(){
 const [mode,setMode]=useState('login')
 const [code,setCode]=useState('')
 const [name,setName]=useState('')
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [role,setRole]=useState(null)
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const checkCode=async()=>{
  setMessage('')
  const {data,error}=await supabase.rpc('validate_invitation',{p_code:code.trim()})
  if(error||!data?.length){setRole(null);setMessage('Código inválido, usado, revogado ou expirado.');return}
  setRole(data[0])
  if(data[0].intended_name&&!name)setName(data[0].intended_name)
  if(data[0].intended_email&&!email)setEmail(data[0].intended_email)
 }
 const submit=async(e)=>{
  e.preventDefault();setMessage('');setBusy(true)
  try{
   if(mode==='register'){
    if(!role){await checkCode();return}
    const {error}=await supabase.auth.signUp({email,password,options:{data:{name,invite_code:code.trim()}}})
    if(error)throw error
    setMessage('Conta criada. Se a confirmação por e-mail estiver ativa, confira sua caixa de entrada para entrar na casa.')
   }else{
    const {error}=await supabase.auth.signInWithPassword({email,password})
    if(error)throw error
   }
  }catch(err){setMessage(err.message||'Não foi possível concluir.')}finally{setBusy(false)}
 }
 const switchMode=()=>{setMode(mode==='login'?'register':'login');setMessage('');setRole(null)}
 return <div className="auth-wrap">
  <div className="auth-card">
   <div className="auth-brand"><div className="brand-mark">PBC</div><span className="eyebrow">Terreiro Pai Benedito do Congo</span></div>
   <h1>{mode==='login'?'Bem-vindo de volta.':'Entre para a casa.'}</h1>
   <p className="muted">{mode==='login'?'Acesse sua área da comunidade.':'Use o código recebido para criar seu acesso.'}</p>
   {message&&<div className="form-message">{message}</div>}
   <form onSubmit={submit}>
    {mode==='register'&&<div className="auth-register-fields">
     <label>Nome<input value={name} onChange={e=>setName(e.target.value)} required /></label>
     <label>Código de convite><div className="code-row"><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="PBC-XXXXXXXXXXXX" required /><button type="button" onClick={checkCode}>Validar</button></div></label>
     {role&&<div className="invite-valid"><ShieldCheck size={16}/> Convite válido para <strong>{role.role==='admin'?'Administrador':role.role==='editor'?'Editor':'Membro'}</strong></div>}
    </div>}
    <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
    <label>Senha<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required /></label>
    <button className="primary-button" disabled={busy}>{busy?'Aguarde…':mode==='login'?'Entrar':'Criar minha conta'}</button>
   </form>
   <button className="switch-auth" type="button" onClick={switchMode}>{mode==='login'?'Tenho um código de convite':'Já tenho uma conta'}</button>
  </div>
 </div>
}
'''

# The source above intentionally uses a normal JSX label; repair a typo if the script text is edited later.
replacement = replacement.replace('Código de convite><', 'Código de convite<')
path.write_text(source[:start] + replacement + source[end:], encoding='utf-8')
print('AuthScreen repaired')
