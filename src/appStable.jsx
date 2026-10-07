// ===================================================================
// CONTEÚDOS DA CASA — blog (membros) + gestão (editores/administração)
// Campos novos em house_contents: summary, cover_url, cover_color, is_required, reminded_at
// Leitura: house_content_reads (abrir = first_read_at; "Li e entendi" = confirmed_at)
// ===================================================================
const CONTENT_TAGS=['Banhos','Ensinamentos','Recados dos Pais da Casa','Macumbas de Terreiro'];
const CONTENT_COLORS=['#65745A','#8B6F47','#A65D4A','#8A6A8F','#55758A','#B78A3D','#7B5B45','#6F7F76'];
const CONTENT_EMOJIS=['🙏','🌿','✨','🕯️','🌸','💧','🔥','🌙','☀️','⭐','❤️','🤍','🌊','🍃','🪶','📿','🥁','⚠️','📌','✅'];
const ALLOWED_TAGS={P:1,BR:1,B:1,STRONG:1,I:1,EM:1,U:1,H2:1,H3:1,UL:1,OL:1,LI:1,BLOCKQUOTE:1,A:1,DIV:1,SPAN:1};
// Mantém só a formatação permitida (sem scripts, estilos, eventos ou cores livres).
function sanitizeContentHtml(html){
 const src=String(html||'');if(!/<[a-z][\s\S]*>/i.test(src))return src.split(/\n\n+/).map(x=>'<p>'+x.replace(/&/g,'&amp;').replace(/</g,'&lt;').split('\n').join('<br>')+'</p>').join('');
 const box=document.createElement('div');box.innerHTML=src;
 const walk=node=>{[...node.childNodes].forEach(ch=>{if(ch.nodeType===1){if(!ALLOWED_TAGS[ch.tagName]){if(['SCRIPT','STYLE','IFRAME','OBJECT'].includes(ch.tagName)){ch.remove();return}walk(ch);ch.replaceWith(...ch.childNodes);return}
   const href=ch.tagName==='A'?ch.getAttribute('href'):null;[...ch.attributes].forEach(a=>ch.removeAttribute(a.name));
   if(ch.tagName==='DIV'){const p=document.createElement('p');p.append(...ch.childNodes);ch.replaceWith(p);walk(p);return}
   if(ch.tagName==='A'){if(href&&/^https?:\/\//i.test(href)){ch.setAttribute('href',href);ch.setAttribute('target','_blank');ch.setAttribute('rel','noopener noreferrer')}else{ch.replaceWith(...ch.childNodes);return}}
   walk(ch)}else if(ch.nodeType!==3)ch.remove()})};
 walk(box);return box.innerHTML;
}
const contentPlain=html=>{const d=document.createElement('div');d.innerHTML=sanitizeContentHtml(html).replace(/<\/(p|h2|h3|li|blockquote)>/g,'</$1> ').replace(/<br>/g,' ');return String(d.textContent||'').replace(/\s+/g,' ').trim()};
const readingMinutes=html=>Math.max(1,Math.round(contentPlain(html).split(' ').filter(Boolean).length/200));
const contentSummary=x=>x.summary?.trim()||(t=>t.length>140?t.slice(0,140).trim()+'…':t)(contentPlain(x.body));
const coverStyle=x=>x.cover_url?{backgroundImage:'url("'+x.cover_url+'")'}:{background:x.cover_color||'#65745A'};

function ContentArticle({x,authorName,read,onBack,onConfirm,confirming,preview=false}){
 return <article className="bl-article">
  {!preview&&<button type="button" className="btn bl-back" onClick={onBack}><ArrowLeft size={15}/> Voltar</button>}
  <div className={'bl-cover'+(x.cover_url?' has-image':'')} style={coverStyle(x)}>{x.is_required&&<span className="bl-badge">Leitura obrigatória</span>}</div>
  <div className="bl-article-inner">
   {x.tags?.length>0&&<div className="bl-tags">{x.tags.map(t=><span key={t}>{t}</span>)}</div>}
   <h1>{x.title||'Título do conteúdo'}</h1>
   <p className="bl-meta">{authorName?authorName+' · ':''}{readingMinutes(x.body)} min de leitura{x.created_at?' · '+new Date(x.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}):''}</p>
   {x.summary&&<p className="bl-lead">{x.summary}</p>}
   <div className="bl-body" dangerouslySetInnerHTML={{__html:sanitizeContentHtml(x.body)||'<p>…</p>'}}/>
   {x.is_required&&<div className="bl-confirm">{read?.confirmed_at?<p className="bl-confirmed"><Check size={17}/> Você confirmou a leitura em {new Date(read.confirmed_at).toLocaleDateString('pt-BR')}.</p>:<><p>Este conteúdo é de leitura obrigatória.</p><button type="button" className="btn primary" disabled={confirming||preview} onClick={onConfirm}><Check size={16}/> {confirming?'Confirmando…':'Li e entendi'}</button></>}</div>}
  </div>
 </article>
}

function HouseContent({back,p}){
 const[items,setItems]=useState([]),[notices,setNotices]=useState([]),[authors,setAuthors]=useState({}),[section,setSection]=useState('content'),[tag,setTag]=useState('Todos'),[reads,setReads]=useState({}),[selected,setSelected]=useState(null),[confirming,setConfirming]=useState(false),[msg,setMsg]=useState(''),[loading,setLoading]=useState(true);
 const load=async()=>{const[{data:c},{data:n},{data:r}]=await Promise.all([supabase.from('house_contents').select('*').order('sort_order').order('created_at',{ascending:false}),supabase.from('notices').select('*').order('created_at',{ascending:false}),supabase.from('house_content_reads').select('*').eq('profile_id',p.id)]);
  setItems(c||[]);setNotices(n||[]);setReads(Object.fromEntries((r||[]).map(x=>[x.content_id,x])));
  const ids=[...new Set((c||[]).map(x=>x.created_by).filter(Boolean))];if(ids.length){const{data:pr}=await supabase.from('profiles').select('id,name').in('id',ids);setAuthors(Object.fromEntries((pr||[]).map(x=>[x.id,x.name])))}setLoading(false)};
 useEffect(()=>{load();supabase.rpc('touch_my_last_seen')},[]);
 const open=async x=>{setSelected(x);setMsg('');window.scrollTo({top:0});if(!reads[x.id]){const{error}=await supabase.rpc('mark_house_content_read',{p_content_id:x.id});if(!error)setReads(v=>({...v,[x.id]:{...(v[x.id]||{}),content_id:x.id,first_read_at:new Date().toISOString()}}))}};
 const confirm=async()=>{if(!selected||confirming)return;setConfirming(true);const{error}=await supabase.rpc('confirm_house_content_read',{p_content_id:selected.id});setConfirming(false);if(error){setMsg('Não foi possível confirmar agora: '+err(error));return}setReads(v=>({...v,[selected.id]:{...(v[selected.id]||{}),confirmed_at:new Date().toISOString()}}))};
 if(selected)return <div className="bl">{msg&&<div className="gw-warning">{msg}</div>}<ContentArticle x={selected} authorName={authors[selected.created_by]} read={reads[selected.id]} confirming={confirming} onConfirm={confirm} onBack={()=>setSelected(null)}/></div>;
 const contents=items.filter(x=>x.content_type==='content'),rules=items.filter(x=>x.content_type==='rule');
 const pendingRequired=contents.filter(x=>x.is_required&&!reads[x.id]?.confirmed_at);
 const shown=tag==='Todos'?contents:contents.filter(x=>Array.isArray(x.tags)&&x.tags.includes(tag));
 const hero=tag==='Todos'?(pendingRequired[0]||shown.find(x=>x.featured)):null;
 const list=shown.filter(x=>x!==hero);
 const status=x=>x.is_required&&!reads[x.id]?.confirmed_at?<span className="bl-st is-req">Obrigatória</span>:reads[x.id]?<span className="bl-st is-read"><Check size={12}/> Lido</span>:<span className="bl-st is-new">Novo</span>;
 return <div className="bl">
  <div className="bl-head"><span className="eyebrow">NOSSA CASA</span><h1>Conteúdos</h1><p className="muted">Ensinamentos, avisos e regras da casa</p></div>
  <div className="bl-seg" role="tablist">{[['content','Conteúdos'],['notice','Avisos'],['rule','Regras']].map(([k,l])=><button key={k} role="tab" aria-selected={section===k} className={section===k?'is-on':''} onClick={()=>{setSection(k);setTag('Todos')}}>{l}{k==='content'&&pendingRequired.length>0&&<i className="bl-dot-count">{pendingRequired.length}</i>}</button>)}</div>
  {loading?<div className="hm-skeleton" style={{marginTop:14}}/>:<>
  {section==='content'&&<>
   <div className="mu-chips bl-chips">{['Todos',...CONTENT_TAGS].map(t=><button type="button" key={t} className={'mu-chip'+(tag===t?' is-on':'')} onClick={()=>setTag(t)}>{t==='Recados dos Pais da Casa'?'Recados dos Pais':t}</button>)}</div>
   {hero&&<button type="button" className={'bl-hero'+(hero.cover_url?' has-image':'')} style={coverStyle(hero)} onClick={()=>open(hero)}><span className="bl-hero-shade"/><span className="bl-hero-text">{hero.is_required&&!reads[hero.id]?.confirmed_at?<span className="bl-badge">Leitura obrigatória</span>:<span className="bl-badge">Em destaque</span>}<b>{hero.title}</b><small>{authors[hero.created_by]?authors[hero.created_by]+' · ':''}{readingMinutes(hero.body)} min de leitura</small></span></button>}
   <div className="bl-list">{list.map(x=><button type="button" className="bl-item" key={x.id} onClick={()=>open(x)}><span className={'bl-thumb'+(x.cover_url?' has-image':'')} style={coverStyle(x)}/><span className="bl-item-text"><span className="bl-item-top">{x.tags?.[0]&&<small>{x.tags[0]}</small>}{status(x)}</span><b>{x.title}</b><small className="bl-item-sum">{contentSummary(x)}</small><small className="bl-item-time">{readingMinutes(x.body)} min de leitura</small></span></button>)}
    {!list.length&&!hero&&<div className="mu-empty">Nenhum conteúdo por aqui ainda.</div>}</div>
  </>}
  {section==='notice'&&<div className="bl-list">{notices.length?notices.map(x=><div className="bl-notice" key={x.id}><span className="bl-notice-icon"><Bell size={17}/></span><div><b>{x.title}</b><div className="bl-body bl-body-sm" dangerouslySetInnerHTML={{__html:sanitizeContentHtml(x.body)}}/>{x.ends_at&&<small className="muted">Válido até {dateTime(x.ends_at)}</small>}</div></div>):<div className="mu-empty">Nenhum aviso ativo.</div>}</div>}
  {section==='rule'&&<div className="bl-list">{rules.length?rules.map((x,i)=><button type="button" className="bl-rule" key={x.id} onClick={()=>open(x)}><span className="bl-rule-n">{String(i+1).padStart(2,'0')}</span><span><b>{x.title}</b><small>{contentSummary(x)}</small></span><ChevronRight size={16}/></button>):<div className="mu-empty">Nenhuma regra publicada.</div>}</div>}
  </>}
 </div>
}

// ----------------------------- GESTÃO -----------------------------
function RichEditor({editorRef,initialHtml,onChange,placeholder}){
 const[emojiOpen,setEmojiOpen]=useState(false);
 useEffect(()=>{if(editorRef.current)editorRef.current.innerHTML=sanitizeContentHtml(initialHtml||'')},[]);
 const cmd=(c,v=null)=>{editorRef.current?.focus();document.execCommand(c,false,v);onChange&&onChange(editorRef.current.innerHTML)};
 const block=tag=>cmd('formatBlock','<'+tag+'>');
 const link=()=>{const url=window.prompt('Endereço do link (começando com https://)');if(url&&/^https?:\/\//i.test(url.trim()))cmd('createLink',url.trim());else if(url)alert('Use um endereço começando com https://')};
 const B=({title,onClick,children})=><button type="button" title={title} aria-label={title} onMouseDown={e=>{e.preventDefault();onClick()}}>{children}</button>;
 return <div className="bl-editor">
  <div className="bl-toolbar" role="toolbar" aria-label="Formatação">
   <B title="Título" onClick={()=>block('h2')}><b>T</b></B><B title="Subtítulo" onClick={()=>block('h3')}><b style={{fontSize:'.8em'}}>T</b></B><B title="Texto normal" onClick={()=>block('p')}>¶</B><i className="bl-sep"/>
   <B title="Negrito" onClick={()=>cmd('bold')}><b>B</b></B><B title="Itálico" onClick={()=>cmd('italic')}><i>I</i></B><B title="Sublinhado" onClick={()=>cmd('underline')}><u>U</u></B><i className="bl-sep"/>
   <B title="Lista com marcadores" onClick={()=>cmd('insertUnorderedList')}>•</B><B title="Lista numerada" onClick={()=>cmd('insertOrderedList')}>1.</B><B title="Citação em destaque" onClick={()=>block('blockquote')}>❝</B><B title="Link" onClick={link}>🔗</B>
   <span className="bl-emoji-wrap"><B title="Emojis" onClick={()=>setEmojiOpen(v=>!v)}>😊</B>{emojiOpen&&<span className="bl-emoji-pop">{CONTENT_EMOJIS.map(e=><button type="button" key={e} onMouseDown={ev=>{ev.preventDefault();cmd('insertText',e);setEmojiOpen(false)}}>{e}</button>)}</span>}</span>
   <B title="Limpar formatação" onClick={()=>{cmd('removeFormat');block('p')}}>✕</B>
  </div>
  <div ref={editorRef} className="bl-body bl-editable" contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={e=>onChange&&onChange(e.currentTarget.innerHTML)}/>
 </div>
}

function ContentReaders({x,onClose}){
 const[rows,setRows]=useState(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{supabase.rpc('admin_house_content_readers',{p_content_id:x.id}).then(({data,error})=>{if(error)setMsg(err(error));setRows(data||[])})},[x.id]);
 const confirmed=(rows||[]).filter(r=>r.confirmed_at),opened=(rows||[]).filter(r=>!r.confirmed_at&&r.first_read_at),missing=(rows||[]).filter(r=>!r.confirmed_at&&!r.first_read_at);
 const done=x.is_required?confirmed.length:confirmed.length+opened.length,total=(rows||[]).length;
 const remind=async()=>{if(busy)return;setBusy(true);const{error}=await supabase.rpc('remind_house_content',{p_content_id:x.id});setBusy(false);setMsg(error?err(error):'Lembrete enviado: o conteúdo volta para o topo da tela inicial de quem ainda não '+(x.is_required?'confirmou':'leu')+'.')};
 const pending=x.is_required?[...opened,...missing]:missing;
 return <div className="card bl-readers">
  <div className="row between"><div><span className="eyebrow">QUEM JÁ LEU</span><h3>{x.title}</h3></div><button className="btn" onClick={onClose}>Fechar</button></div>
  {rows===null?<p className="muted">Carregando…</p>:<>
   <div className="bl-progress"><b>{done} de {total}</b><span>{x.is_required?'confirmaram a leitura':'abriram o conteúdo'}</span></div>
   <div className="bl-bar"><i style={{width:(total?Math.round(done/total*100):0)+'%'}}/></div>
   {pending.length>0&&<><p className="bl-sub">Ainda não {x.is_required?'confirmaram':'leram'} · {pending.length}</p>{pending.map(r=><div className="bl-reader" key={r.profile_id}><span>{r.name}</span><small>{r.first_read_at?'abriu, não confirmou':'não abriu'}</small></div>)}
    <button className="btn primary" style={{marginTop:12}} disabled={busy} onClick={remind}><Bell size={15}/> {busy?'Enviando…':'Lembrar quem não leu'}</button></>}
   {!pending.length&&total>0&&<p className="bl-confirmed"><Check size={16}/> Todo mundo já leu.</p>}
  </>}
  {msg&&<div className="toast">{msg}</div>}
 </div>
}

function Content(){
 const[items,setItems]=useState([]),[notices,setNotices]=useState([]),[stats,setStats]=useState({}),[section,setSection]=useState('content'),[view,setView]=useState('list'),[form,setForm]=useState(null),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[readersOf,setReadersOf]=useState(null),[preview,setPreview]=useState(false);
 const editorRef=useRef(null);const labels={content:'Conteúdo',rule:'Regra da casa',notice:'Aviso da casa'};
 const toInputDate=s=>s?new Date(s).toISOString().slice(0,16):'';
 const load=async()=>{const[{data:hc,error:he},{data:no,error:ne},{data:st}]=await Promise.all([supabase.from('house_contents').select('*').order('sort_order').order('created_at',{ascending:false}),supabase.rpc('editor_list_notices'),supabase.rpc('admin_house_content_read_summary')]);if(he||ne)setMessage(err(he||ne));setItems(hc||[]);setNotices(no||[]);setStats(Object.fromEntries((st||[]).map(x=>[x.content_id,x])))};
 useEffect(()=>{load()},[]);
 const blank=k=>({kind:k,id:null,title:'',summary:'',body:'',tags:[],featured:false,is_required:false,cover_url:'',cover_color:CONTENT_COLORS[0],coverFile:null,starts_at:'',ends_at:'',published:true});
 const startNew=()=>{setForm(blank(section));setPreview(false);setMessage('');setView('edit');window.scrollTo({top:0})};
 const startEdit=x=>{setForm({...blank(x._kind),...x,kind:x._kind,tags:Array.isArray(x.tags)?x.tags:[],cover_url:x.cover_url||'',cover_color:x.cover_color||CONTENT_COLORS[0],starts_at:toInputDate(x.starts_at),ends_at:toInputDate(x.ends_at),published:x.published!==false,coverFile:null});setPreview(false);setMessage('');setView('edit');window.scrollTo({top:0})};
 const set=patch=>setForm(f=>({...f,...patch}));
 const uploadCover=async file=>{const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path='conteudos/'+Date.now()+'.'+ext;const{error}=await supabase.storage.from('gira-art').upload(path,file,{upsert:true,contentType:file.type||undefined});if(error)throw error;return supabase.storage.from('gira-art').getPublicUrl(path).data.publicUrl};
 const save=async()=>{if(saving)return;const html=sanitizeContentHtml(editorRef.current?.innerHTML||form.body);if(!form.title.trim()||!contentPlain(html)){setMessage('Preencha o título e o texto.');return}setSaving(true);setMessage('');
  try{if(form.kind==='notice'){const args={p_title:form.title.trim(),p_body:html,p_starts_at:form.starts_at?new Date(form.starts_at).toISOString():null,p_ends_at:form.ends_at?new Date(form.ends_at).toISOString():null,p_published:form.published};const{error}=await(form.id?supabase.rpc('editor_update_notice',{p_id:form.id,...args}):supabase.rpc('editor_create_notice',args));if(error)throw error}
   else{let cover=form.cover_url;if(form.coverFile)cover=await uploadCover(form.coverFile);const{error}=await supabase.rpc('editor_save_house_content',{p_id:form.id||null,p_data:{title:form.title.trim(),summary:form.summary.trim(),body:html,content_type:form.kind,tags:form.kind==='content'?form.tags:[],featured:form.kind==='content'&&form.featured,is_required:form.is_required,cover_url:form.kind==='content'?cover||'':'',cover_color:form.kind==='content'?form.cover_color:'',sort_order:form.id?(form.sort_order||0):items.length}});if(error)throw error}
   setSaving(false);setView('list');setForm(null);setMessage(form.id?'Alterações salvas.':labels[form.kind]+' publicado.');load()}
  catch(e){setSaving(false);setMessage('Não foi possível salvar: '+err(e))}};
 const remove=async x=>{if(!confirm('Excluir "'+x.title+'"? Esta ação não pode ser desfeita.'))return;const{error}=await(x._kind==='notice'?supabase.rpc('editor_delete_notice',{p_id:x.id}):supabase.rpc('editor_delete_house_content',{p_id:x.id}));if(error)setMessage(err(error));else{setMessage('Item excluído.');load()}};
 const all=[...items.filter(x=>x.content_type==='content').map(x=>({...x,_kind:'content'})),...items.filter(x=>x.content_type==='rule').map(x=>({...x,_kind:'rule'})),...notices.map(x=>({...x,_kind:'notice'}))];
 const shown=all.filter(x=>x._kind===section);

 if(view==='edit'&&form){const isContent=form.kind==='content';const previewItem={...form,body:editorRef.current?.innerHTML||form.body,cover_url:form.coverFile?URL.createObjectURL(form.coverFile):form.cover_url};
  return <div className="bl-admin">
   <button className="btn gira-admin-back" onClick={()=>{if(confirm('Sair sem salvar?')){setView('list');setForm(null)}}}><ArrowLeft size={14}/> Voltar</button>
   <div className="row between" style={{margin:'12px 0'}}><div><span className="eyebrow">{form.id?'EDITAR':'NOVO'}</span><h2 style={{margin:0}}>{labels[form.kind]}</h2></div><div className="bl-seg bl-seg-sm"><button className={!preview?'is-on':''} onClick={()=>setPreview(false)}>Escrever</button><button className={preview?'is-on':''} onClick={()=>{set({body:editorRef.current?.innerHTML||form.body});setPreview(true)}}>Pré-visualizar</button></div></div>
   {message&&<div className="gw-warning">{message}</div>}
   {preview?<div className="gw-preview-frame"><ContentArticle x={previewItem} preview read={null}/></div>:<div className="card gw-panel">
    {isContent&&<div className="field"><label>Capa</label><div className={'bl-cover-edit'+(form.coverFile||form.cover_url?' has-image':'')} style={form.coverFile?{backgroundImage:'url("'+URL.createObjectURL(form.coverFile)+'")'}:coverStyle(form)}><label className="btn"><input type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f)set({coverFile:f})}}/>Escolher imagem</label>{(form.coverFile||form.cover_url)&&<button type="button" className="btn" onClick={()=>set({coverFile:null,cover_url:''})}>Usar cor</button>}</div>
     {!form.coverFile&&!form.cover_url&&<div className="gira-color-palette" style={{marginTop:8}}>{CONTENT_COLORS.map(c=><button type="button" key={c} aria-label={'Cor '+c} className={'gira-color-dot '+(form.cover_color===c?'selected':'')} style={{background:c}} onClick={()=>set({cover_color:c})}/>)}</div>}</div>}
    <div className="field"><label htmlFor="bl-title">Título</label><input id="bl-title" className="input bl-title-input" value={form.title} onChange={e=>set({title:e.target.value})} placeholder={form.kind==='notice'?'Ex.: Mudança no horário da gira':'Ex.: Como se preparar para a gira'}/></div>
    {isContent&&<div className="field"><label htmlFor="bl-sum">Resumo <small className="muted">(aparece no cartão; uma frase)</small></label><input id="bl-sum" className="input" maxLength={160} value={form.summary} onChange={e=>set({summary:e.target.value})} placeholder="Ex.: O que levar, como chegar e o que observar"/></div>}
    <div className="field"><label>Texto</label><RichEditor key={form.id||'novo-'+form.kind} editorRef={editorRef} initialHtml={form.body} placeholder="Escreva aqui…"/></div>
    {isContent&&<div className="field"><label>Etiquetas</label><div className="mu-chips" style={{flexWrap:'wrap'}}>{CONTENT_TAGS.map(t=><button type="button" key={t} className={'mu-chip'+(form.tags.includes(t)?' is-on':'')} onClick={()=>set({tags:form.tags.includes(t)?form.tags.filter(v=>v!==t):[...form.tags,t]})}>{t}</button>)}</div></div>}
    {form.kind!=='notice'&&<div className="bl-toggles">
     <label className={'bl-toggle'+(form.is_required?' is-on':'')}><input type="checkbox" checked={form.is_required} onChange={e=>set({is_required:e.target.checked})}/><span><b>Leitura obrigatória</b><small>Termina com "Li e entendi" e fica na tela inicial até a pessoa confirmar.</small></span></label>
     {isContent&&<label className={'bl-toggle'+(form.featured?' is-on':'')}><input type="checkbox" checked={form.featured} onChange={e=>set({featured:e.target.checked})}/><span><b>Destacar no topo</b><small>Aparece em destaque em Conteúdos.</small></span></label>}
    </div>}
    {form.kind==='notice'&&<><div className="grid"><Field label="Exibir a partir de"><input className="input" type="datetime-local" value={form.starts_at} onChange={e=>set({starts_at:e.target.value})}/></Field><Field label="Exibir até"><input className="input" type="datetime-local" value={form.ends_at} onChange={e=>set({ends_at:e.target.value})}/></Field></div><label className={'bl-toggle'+(form.published?' is-on':'')}><input type="checkbox" checked={form.published} onChange={e=>set({published:e.target.checked})}/><span><b>Publicado</b><small>Desmarque para deixar o aviso oculto.</small></span></label></>}
   </div>}
   <div className="gw-actions"><span/><div className="gw-actions-right"><button className="btn primary" disabled={saving} onClick={save}>{saving?'Salvando…':form.id?'Salvar alterações':'Publicar'}</button></div></div>
  </div>}

 return <div className="bl-admin">
  <div className="row between gira-admin-header"><div><span className="eyebrow">GESTÃO DA CASA</span><h2>Conteúdos</h2><p className="muted">Publique e acompanhe quem está lendo.</p></div><button className="btn primary" onClick={startNew}><Plus size={14}/> Novo {section==='content'?'conteúdo':section==='notice'?'aviso':'regra'}</button></div>
  {message&&<div className="toast">{message}</div>}
  <div className="bl-seg">{[['content','Conteúdos'],['notice','Avisos'],['rule','Regras']].map(([k,l])=><button key={k} className={section===k?'is-on':''} onClick={()=>{setSection(k);setReadersOf(null)}}>{l}</button>)}</div>
  {readersOf&&<ContentReaders x={readersOf} onClose={()=>setReadersOf(null)}/>}
  <div className="bl-list">{!shown.length?<div className="mu-empty">Nada publicado aqui ainda.</div>:shown.map(x=>{const st=stats[x.id];const done=st?(x.is_required?st.confirmed:st.opened):0;return <div className="bl-admin-item" key={x.id}>
   {x._kind==='content'?<span className={'bl-thumb'+(x.cover_url?' has-image':'')} style={coverStyle(x)}/>:<span className="bl-notice-icon">{x._kind==='notice'?<Bell size={17}/>:<FileText size={17}/>}</span>}
   <div className="bl-admin-text"><b>{x.title}</b><span className="bl-admin-pills">{x.is_required&&<span className="bl-st is-req">Obrigatória</span>}{x.featured&&<span className="bl-st is-new">Destaque</span>}{x._kind==='notice'&&<span className="bl-st">{x.published===false?'Oculto':'Publicado'}</span>}</span>
    {x._kind!=='notice'&&st&&<button type="button" className="bl-admin-reads" onClick={()=>setReadersOf(x)}><span className="bl-bar bl-bar-sm"><i style={{width:(st.total?Math.round(done/st.total*100):0)+'%'}}/></span>{done}/{st.total} {x.is_required?'confirmaram':'leram'} · ver quem</button>}</div>
   <div className="bl-admin-actions"><button className="btn" onClick={()=>startEdit(x)} aria-label={'Editar '+x.title}><Pencil size={14}/></button><button className="btn danger" onClick={()=>remove(x)} aria-label={'Excluir '+x.title}><Trash2 size={14}/></button></div>
  </div>})}</div>
 </div>
}

import React,{useEffect,useState,useRef} from 'react'
import { TERREIRO_LOGO } from './logoData';
import {createRoot} from 'react-dom/client'
import {Home as HomeIcon,CalendarDays,Leaf,UserRound,WalletCards,BookOpen,ShieldCheck,LogOut,Check,X,Plus,RefreshCw,ChevronRight,Users,ClipboardList,Ticket,FileText,Save,Trash2,ArrowLeft,Eye as EyeIcon,CircleHelp,Download,Pencil,Bell,Upload} from 'lucide-react'
import {supabase} from './lib/supabase'
import {OrixaIcon,ORIXAS} from './orixaSymbols'
import './styles.css'
import './app.css'
const types={gira:'Gira normal',desenvolvimento:'Desenvolvimento',interna:'Gira interna',festa:'Festa',quintal:'Quintal Ancestral',evento:'Evento do terreiro',reuniao:'Reunião',outra:'Outra atividade'}
const typeIcons={gira:'🌿',desenvolvimento:'✨',interna:'🔒',festa:'🎉',quintal:'🌳',evento:'📅',reuniao:'🤝',outra:'○'}
const entityLines=[['eres','🧒🏿','Erês / Crianças'],['pretos_velhos','☕','Pretos-Velhos'],['caboclos','🌿','Caboclos'],['baianos','🥁','Baianos'],['boiadeiros','🐎','Boiadeiros'],['marinheiros','⚓','Marinheiros'],['ciganos','💃','Ciganos'],['malandros','🎩','Malandros'],['exus','🔱','Exus'],['pombagiras','🌹','Pombagiras'],['exus_mirins','🔥','Exus-Mirins']]
const lineInfo=id=>entityLines.find(x=>x[0]===id)
const typeLabel=k=>typeIcons[k]+' '+(types[k]||'Gira')
const kinds=[['ensinamento','Ensinamentos'],['reflexao','Reflexões'],['senti','O que senti']]
const groups=['Decoração','Cozinha','Comunicação','Manutenção','Organização']
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const financialEligible=(dob,referenceDate=new Date(),isPaiDeSanto=false)=>{if(isPaiDeSanto)return false;if(!dob)return true;const birth=new Date(dob+'T12:00:00');const monthStart=new Date(referenceDate.getFullYear(),referenceDate.getMonth(),1);const eighteenth=new Date(birth.getFullYear()+18,birth.getMonth(),1);return eighteenth<=monthStart}
const dateTime=s=>new Date(s).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})

const err=e=>e?.message||'Não foi possível concluir.'

function App(){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[screen,setScreen]=useState('home'),[memberPreview,setMemberPreview]=useState(false)
 const loadProfile=async u=>{if(!u){setProfile(null);return}await supabase.rpc('record_profile_seen');const {data}=await supabase.from('profiles').select('*,groups(name)').eq('id',u.id).maybeSingle();setProfile(data)}
 useEffect(()=>{supabase.auth.getSession().then(async({data})=>{setSession(data.session);await loadProfile(data.session?.user);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>{setSession(s);loadProfile(s?.user)});return()=>subscription.unsubscribe()},[])
 if(loading)return <div className="auth"><div className="card"><h2>Terreiro Pai Benedito do Congo</h2><p className="muted">Carregando…</p></div></div>
 if(!session)return <Auth/>
 if(!profile)return <div className="auth"><div className="card">Seu cadastro está sendo carregado…</div></div>
 const logout=async()=>{await supabase.auth.signOut();setScreen('home')}
 return <div className="app">
<header className="top">
  <img src={TERREIRO_LOGO} alt="Terreiro Pai Benedito do Congo" className="logo" />
  <div><small>Terreiro Pai Benedito do Congo</small><strong>Axé, comunidade.</strong></div>
  <div className="top-actions">
    {profile.role==='admin'&&<button className={'preview-toggle '+(memberPreview?'member':'admin')} onClick={()=>{setMemberPreview(!memberPreview);setScreen('home')}}>{memberPreview?'← Voltar para ADM':'Visualizar como membro'}</button>}
    <OrixaIcon name={profile.orixa_symbol} size={30}/>
  </div>
</header>
{profile.role==='admin'&&memberPreview&&<div className="preview-banner"><EyeIcon size={15}/> Visualização de membro · os controles administrativos estão ocultos.</div>}
<main className="content">
  {screen==='home'&&<Home p={profile} go={setScreen} memberPreview={memberPreview}/>}
  {screen==='giras'&&<Giras p={profile}/>}
  {screen==='community'&&<Community p={profile}/>}
  {screen==='content'&&<HouseContent p={profile} back={()=>setScreen('home')}/>} 
  {screen==='me'&&<Me p={profile} go={setScreen} logout={logout} memberPreview={memberPreview}/>} {screen==='contact'&&<ContactParents back={()=>setScreen('home')}/>}
  {screen==='admin'&&!memberPreview&&(profile.role==='admin'||profile.role==='editor'||profile.is_finance_manager)&&<Admin p={profile}/>}
</main>
<Birthday/>
<nav className="bottom"><div className="bottom-inner">{[['home','Início',HomeIcon],['giras','Agenda',CalendarDays],['community','Mural',Leaf],['content','Conteúdos',BookOpen],['me','Meu espaço',UserRound]].map(([id,label,Icon])=><button key={id} className={screen===id?'active':''} onClick={()=>setScreen(id)}><Icon size={20}/>{label}</button>)}</div></nav>
</div>
}

function Auth(){const [register,setRegister]=useState(false),[code,setCode]=useState(''),[invite,setInvite]=useState(null),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[dob,setDob]=useState(''),[orixa,setOrixa]=useState(''),[group,setGroup]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const normalizeCode=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const validate=async()=>{const raw=code.trim();if(!raw){setInvite(null);setMessage('Digite o código de convite.');return}const{data:statusError}=await supabase.rpc('get_invitation_status',{p_code:raw});const status=statusError||'not_found';if(status!=='active'){setInvite(null);setMessage(status==='used'?'Este convite já foi utilizado.':status==='expired'?'Este convite expirou.':status==='revoked'?'Este convite foi revogado.':'Código de convite não encontrado.');return}const{data,error}=await supabase.rpc('validate_invitation',{p_code:raw});if(error||!data?.length){setInvite(null);setMessage('Não foi possível validar este convite.');return}setInvite(data[0]);setName(data[0].intended_name||'');setEmail(data[0].intended_email||'');setMessage('Convite válido.')};
 const submit=async e=>{e.preventDefault();setBusy(true);setMessage('');try{if(register){if(!invite){await validate();return}if(!dob||!orixa||!group)throw new Error('Preencha data de nascimento, Orixá e grupo.');const{data,error}=await supabase.auth.signUp({email,password,options:{data:{name,invite_code:normalizeCode(code),date_of_birth:dob,orixa_symbol:orixa,group_name:group}}});if(error)throw error;setMessage(data.session?'Conta criada. Entrando na casa…':'Conta criada. Agora você já pode entrar.')}else{const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw new Error('E-mail ou senha incorretos. Se você ainda não criou sua conta, use "Tenho um código de convite".')}}catch(e){setMessage(err(e))}finally{setBusy(false)}};return <div className="auth"><div className="card"><div className="row"><img src={TERREIRO_LOGO} alt="Terreiro Pai Benedito do Congo" className="logo"/><span className="eyebrow">Terreiro Pai Benedito do Congo</span></div><h1>{register?'Entre para a casa.':'Bem-vindo de volta.'}</h1>{message&&<div className="toast">{message}</div>}<form onSubmit={submit}>{register&&<><Field label="Nome"><input className="input" value={name} onChange={e=>setName(e.target.value)} required/></Field><Field label="Código de convite"><div className="row"><input className="input" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required/><button className="btn" type="button" onClick={validate}>Validar</button></div></Field>{invite&&<div className="toast"><ShieldCheck size={15}/> Convite para {invite.role}</div>}<Field label="Data de nascimento"><input className="input" type="date" value={dob} onChange={e=>setDob(e.target.value)} required/></Field><Field label="Orixá"><select className="select" value={orixa} onChange={e=>setOrixa(e.target.value)} required><option value="">Escolha</option>{ORIXAS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field><Field label="Grupo"><select className="select" value={group} onChange={e=>setGroup(e.target.value)} required><option value="">Escolha</option>{groups.filter(x=>x!=='Organização').map(x=><option key={x}>{x}</option>)}<option>Ainda não estou em nenhum grupo</option></select></Field></>}<Field label="E-mail"><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field><Field label="Senha"><input className="input" type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} required/></Field><button className="btn primary" style={{width:'100%'}} disabled={busy}>{busy?'Aguarde…':register?'Criar minha conta':'Entrar'}</button></form><button className="btn" style={{width:'100%',marginTop:8}} onClick={()=>{setRegister(!register);setMessage('');setInvite(null)}}>{register?'Já tenho uma conta':'Tenho um código de convite'}</button></div></div>}
function Field({label,children}){return <div className="field"><label>{label}</label>{children}</div>}

// Tela inicial: saudação curta → "Precisa da sua atenção" → próxima gira → novidades da casa.
const HOME_PHRASE='Nossa força vem de quem veio antes e de quem caminha conosco.';
function AttentionItem({item}){return <button type="button" className={'hm-att hm-att-'+item.tone} onClick={item.onClick}><span className="hm-att-icon" aria-hidden="true">{item.icon}</span><span className="hm-att-text"><b>{item.title}</b>{item.text&&<small>{item.text}</small>}</span><span className="hm-att-cta">{item.cta}<ChevronRight size={15}/></span></button>}
function Home({p,go,memberPreview=false}){
 const[gira,setGira]=useState(null),[resp,setResp]=useState(null),[turns,setTurns]=useState([]),[contents,setContents]=useState([]),[notices,setNotices]=useState([]),[turnChangeNotifications,setTurnChangeNotifications]=useState([]),[giraNotifications,setGiraNotifications]=useState([]),[requiredReads,setRequiredReads]=useState([]),[loadingHome,setLoadingHome]=useState(true),[showGiraDescription,setShowGiraDescription]=useState(false);
 const load=async()=>{
  setLoadingHome(true);const now=new Date();
  const[{data:g},{data:c},{data:n},{data:turnChanges},{data:availabilityNotifications}]=await Promise.all([
   supabase.from('giras').select('*').eq('status','published').gte('starts_at',now.toISOString()).order('starts_at').limit(1).maybeSingle(),
   supabase.from('house_contents').select('id,title,body,content_type,tags,created_at').eq('content_type','content').order('created_at',{ascending:false}).limit(3),
   supabase.from('notices').select('id,title,body,starts_at,ends_at,published,created_at').eq('published',true).order('created_at',{ascending:false}).limit(3),
   supabase.rpc('get_my_gira_turn_change_notifications',{p_gira_id:null}),
   supabase.rpc('get_my_gira_turn_availability_notifications',{p_gira_id:null})
  ]);
  setGira(g);setContents(c||[]);setNotices((n||[]).filter(x=>(!x.starts_at||new Date(x.starts_at)<=now)&&(!x.ends_at||new Date(x.ends_at)>=now)));setTurnChangeNotifications((turnChanges||[]).filter(x=>!x.read_at));setGiraNotifications((availabilityNotifications||[]).filter(x=>!x.read_at));
  {const[{data:req},{data:myReads}]=await Promise.all([supabase.from('house_contents').select('id,title,reminded_at').eq('is_required',true).order('created_at',{ascending:false}),supabase.from('house_content_reads').select('content_id,confirmed_at').eq('profile_id',p.id)]);const ok=new Set((myReads||[]).filter(x=>x.confirmed_at).map(x=>x.content_id));setRequiredReads((req||[]).filter(x=>!ok.has(x.id)))}
  if(g){const[{data:r},{data:ts}]=await Promise.all([supabase.from('gira_responses').select('*').eq('gira_id',g.id).eq('profile_id',p.id).maybeSingle(),g.use_task_list?supabase.rpc('gira_turn_summary',{p_gira_id:g.id}):Promise.resolve({data:[]})]);setResp(r);setTurns(ts||[])}else{setResp(null);setTurns([])}
  setLoadingHome(false)
 };
 useEffect(()=>{load()},[p.id]);
 const answer=async status=>{if(!gira)return;const{data,error}=await supabase.from('gira_responses').upsert({gira_id:gira.id,profile_id:p.id,status},{onConflict:'gira_id,profile_id'}).select().single();if(error)return;setResp(data)};
 const fin=useMemberFinance(p),[payOpen,setPayOpen]=useState(false);
 const now=new Date();
 // ---- O que precisa de atenção (ordem = prioridade) ----
 const attention=[];
 if(gira){
  const d=new Date(gira.starts_at),day=86400000,dateText=d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'});
  if(!resp?.status)attention.push({key:'presence',tone:'warning',icon:<CalendarDays size={20}/>,title:'Confirme sua presença',text:gira.name+' · '+dateText,cta:'Responder',onClick:()=>document.getElementById('hm-next-gira')?.scrollIntoView({behavior:'smooth',block:'center'})});
  if(resp?.status==='going'&&gira.use_task_list){
   const open=now>=new Date(d.getTime()-10*day)&&(now<new Date(d.getTime()-3*day)||(gira.turn_availability_reopened_until&&now<new Date(gira.turn_availability_reopened_until)));
   const deadline=now.toDateString()===new Date(d.getTime()-3*day).toDateString();
   const released=now>=new Date(d.getTime()-3*day)&&now<d;
   if(deadline)attention.push({key:'deadline',tone:'danger',icon:<ClipboardList size={20}/>,title:'Último dia para escolher seu turno',text:gira.name,cta:'Escolher',onClick:()=>go('giras')});
   else if(open)attention.push({key:'turns',tone:'warning',icon:<ClipboardList size={20}/>,title:'Escolha seu turno de atividades',text:gira.name,cta:'Escolher',onClick:()=>go('giras')});
   else if(released)attention.push({key:'tasks',tone:'info',icon:<ClipboardList size={20}/>,title:'As tarefas da gira foram organizadas',text:'Acompanhe o seu turno no dia da gira',cta:'Ver',onClick:()=>go('giras')});
  }
 }
 turnChangeNotifications.slice(0,1).forEach(n=>attention.push({key:'turnchange-'+n.id,tone:'warning',icon:<RefreshCw size={19}/>,title:'Seu turno foi alterado',text:n.message,cta:'Ver',onClick:()=>go('giras')}));
 giraNotifications.slice(0,1).forEach(n=>attention.push({key:'gira-'+n.id,tone:'info',icon:<CalendarDays size={20}/>,title:'Novidade na agenda',text:n.message,cta:'Abrir',onClick:()=>go('giras')}));
 requiredReads.forEach(x=>{const reminded=x.reminded_at&&now-new Date(x.reminded_at)<7*86400000;attention.push({key:'read-'+x.id,tone:reminded?'danger':'warning',icon:<BookOpen size={19}/>,title:reminded?'Lembrete: leitura obrigatória':'Leitura obrigatória',text:x.title,cta:'Ler',onClick:()=>go('content')})});
 // ---- Financeiro: comprovantes conferidos, atrasos (a partir do dia de vencimento), lembretes e novas cobranças ----
 const seen=async x=>{await supabase.rpc('mark_payment_proof_seen',{p_id:x.id});fin.reload()};
 fin.reviewed.forEach(x=>attention.push(x.status==='approved'?{key:'proof-'+x.id,tone:'info',icon:<Check size={20}/>,title:'Pagamento confirmado',text:x.description+' · '+money(x.amount),cta:'Ok',onClick:()=>seen(x)}:{key:'proof-'+x.id,tone:'danger',icon:<X size={20}/>,title:'Comprovante recusado',text:x.description+(x.reject_reason?' · '+x.reject_reason:''),cta:'Enviar de novo',onClick:()=>{seen(x);setPayOpen(true)}}));
 const unpaidItems=fin.items.filter(x=>!x.proof),overdueItems=unpaidItems.filter(x=>x.overdue);
 if(overdueItems.length)attention.push({key:'late',tone:'danger',icon:<WalletCards size={20}/>,title:overdueItems.length===1?overdueItems[0].description+' em atraso':overdueItems.length+' pagamentos em atraso',text:money(overdueItems.reduce((n,x)=>n+x.amount,0))+(overdueItems.length===1?' · '+overdueItems[0].dueText:''),cta:'Como pagar',onClick:()=>setPayOpen(true)});
 const curItem=unpaidItems.find(x=>x.kind==='monthly'&&!x.overdue&&x.ym===ymOf(now));
 if(curItem&&now.getDate()>=fin.settings.due_day-fin.settings.reminder_days)attention.push({key:'remind',tone:'warning',icon:<WalletCards size={20}/>,title:'Mensalidade vence dia '+fin.settings.due_day,text:curItem.description+' · '+money(curItem.amount),cta:'Como pagar',onClick:()=>setPayOpen(true)});
 unpaidItems.filter(x=>x.kind==='extra'&&!x.overdue).slice(0,1).forEach(x=>attention.push({key:'charge-'+x.id,tone:'info',icon:<WalletCards size={20}/>,title:'Cobrança em aberto',text:x.description+' · '+money(x.amount),cta:'Como pagar',onClick:()=>setPayOpen(true)}));
 const isManager=!memberPreview&&(p.role==='admin'||p.role==='editor'||p.is_finance_manager);
 const news=[...notices.map(x=>({...x,kind:'Aviso'})),...contents.map(x=>({...x,kind:'Conteúdo'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,4);
 const ago=s=>{const dd=Math.floor((now-new Date(s))/86400000);return dd<=0?'hoje':dd===1?'ontem':dd<7?'há '+dd+' dias':new Date(s).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})};
 const firstName=String(p.name||'').trim().split(' ')[0];
 return <div className="home-page hm">
  <header className="hm-hello">
   <span className="hm-date">{now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</span>
   <h1>Olá{firstName?', '+firstName:''}</h1>
   <p className="hm-phrase">{HOME_PHRASE}</p>
  </header>

  <section className="hm-section" aria-labelledby="hm-att-title">
   <h2 id="hm-att-title" className="hm-label">Precisa da sua atenção{attention.length>0&&<span className="hm-count">{attention.length}</span>}</h2>
   {loadingHome?<div className="hm-skeleton"/>:attention.length?<div className="hm-att-list">{attention.map(x=><AttentionItem key={x.key} item={x}/>)}</div>:<div className="hm-clear"><Check size={18}/><span>Tudo em dia por aqui.</span></div>}
  </section>

  {isManager&&<button type="button" className="hm-manage" onClick={()=>go('admin')}><ShieldCheck size={18}/><span><b>Gestão da Casa</b><small>{p.role==='admin'?'Pessoas, giras, financeiro e conteúdos':p.role==='editor'?'Giras e conteúdos':'Financeiro da casa'}</small></span><ChevronRight size={17}/></button>}

  <section className="hm-section" id="hm-next-gira" aria-labelledby="hm-gira-title">
   <div className="hm-section-head"><h2 id="hm-gira-title" className="hm-label">Próxima gira</h2><button type="button" className="home-link" onClick={()=>go('giras')}>Ver agenda <ChevronRight size={14}/></button></div>
   {gira?<HomeNextGira gira={gira} resp={resp} answer={answer} showGiraDescription={showGiraDescription} setShowGiraDescription={setShowGiraDescription}/>:<div className="hm-empty"><CalendarDays size={20}/><span>Nenhuma gira marcada por enquanto.</span></div>}
  </section>

  {payOpen&&<PayModal p={p} settings={fin.settings} items={fin.items} onClose={()=>setPayOpen(false)} onSent={fin.reload}/>}
  {news.length>0&&<section className="hm-section" aria-labelledby="hm-news-title">
   <div className="hm-section-head"><h2 id="hm-news-title" className="hm-label">Novidades da casa</h2><button type="button" className="home-link" onClick={()=>go('content')}>Ver tudo <ChevronRight size={14}/></button></div>
   <div className="hm-news">{news.map(x=><button type="button" className="hm-news-row" key={x.kind+x.id} onClick={()=>go('content')}><span className="hm-news-icon" aria-hidden="true">{x.kind==='Aviso'?<Bell size={16}/>:<BookOpen size={16}/>}</span><span className="hm-news-text"><small>{x.kind}</small><b>{x.title}</b></span><span className="hm-news-when">{ago(x.created_at)}</span></button>)}</div>
  </section>}
 </div>
}
function UnifiedGiraCard({g,mode='agenda',onOpen,resp,answer,showGiraDescription,setShowGiraDescription}){
 const cover=useReadableCover(g.art_path,g.cover_color||'#65745a');
 const d=new Date(g.starts_at);
 const style={'--gira-cover-image':g.art_path?'url("'+g.art_path+'")':'none','--gira-cover-color':g.cover_color||'#65745a','--gira-text-color':cover.color,'--gira-cover-overlay':cover.overlay};
 const dateBlock=<div className="unified-gira-date"><span className="unified-gira-day">{String(d.getDate()).padStart(2,'0')}</span><span className="unified-gira-month">{d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase()}</span><span className="unified-gira-time">{d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>;
 const content=<div className="unified-gira-visual"><div className="unified-gira-overlay"/><div className="unified-gira-info"><div className="unified-gira-topline"><span className="activity-tag">{typeLabel(g.activity_type)}</span>{mode==='home'&&<span className="unified-gira-next">PRÓXIMA</span>}</div><h3>{g.name}</h3><p className="unified-gira-meta"><CalendarDays size={14}/>{dateTime(g.starts_at)}</p>{g.entity_lines?.length>0&&<div className="unified-gira-chips">{g.entity_lines.map(id=>{const x=lineInfo(id);return x?<span className="unified-gira-chip" key={id}>{x[1]} {x[2]}</span>:null})}</div>}<div className="unified-gira-footer"><span>{g.use_task_list?'✓ Agenda de tarefas':'Sem agenda de tarefas'}</span>{onOpen&&<ChevronRight size={19}/>}</div></div></div>;
 const card=<div className={'unified-gira-card unified-gira-'+mode+(g.art_path?' has-cover':' no-cover')} style={style}>{dateBlock}{content}</div>;
 if(mode==='home') return <div className="unified-gira-home-wrap">{card}<div className="unified-gira-presence"><strong>Você vai?</strong><div className="choice"><button className={'btn '+(resp?.status==='going'?'primary is-selected':'')} onClick={()=>answer('going')}><Check size={15}/>{resp?.status==='going'?'Confirmado':'Vou participar'}</button><button className={'btn '+(resp?.status==='not_going'?'is-selected not-going':'')} onClick={()=>answer('not_going')}><X size={15}/>{resp?.status==='not_going'?'Não vou participar':'Não vou'}</button></div>{resp?.status&&<span className="unified-gira-presence-status">✓ {resp.status==='going'?'Presença confirmada':'Você marcou que não vai'}</span>}</div></div>;
 if(onOpen) return <button type="button" className="unified-gira-clickable" onClick={()=>onOpen(g)}>{card}</button>;
 return card;
}
function HomeNextGira({gira,resp,answer,showGiraDescription,setShowGiraDescription}){
 return <UnifiedGiraCard g={gira} mode="home" resp={resp} answer={answer} showGiraDescription={showGiraDescription} setShowGiraDescription={setShowGiraDescription}/>;
}
function Shortcut({icon:Icon,text,onClick}){return <button className="shortcut" onClick={onClick}><Icon/><b>{text}</b></button>}
function Notice(){const[n,setN]=useState(null);useEffect(()=>{supabase.from('notices').select('*').eq('published',true).order('starts_at',{ascending:false}).limit(1).maybeSingle().then(({data})=>setN(data))},[]);return n?<div className="card notice"><span className="eyebrow">AVISO DA CASA</span><b>{n.title}</b><p>{n.body}</p></div>:null}

function useReadableCover(url,fallback='#65745a'){
 const[style,setStyle]=useState({color:'#fff',overlay:'rgba(22,28,21,.62)'});
 useEffect(()=>{
  let active=true;
  const hexLuma=v=>{const h=(v||fallback).replace('#','');if(h.length!==6)return .45;const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255;const f=x=>x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);return .2126*f(r)+.7152*f(g)+.0722*f(b)};
  const apply=l=>{const dark=l>.58;if(active)setStyle({color:dark?'#273128':'#fff',overlay:dark?'rgba(255,250,241,.48)':'rgba(20,26,20,.58)'})};
  if(!url){const l=hexLuma(fallback);if(active)setStyle({color:l>.58?'#273128':'#fff',overlay:'transparent'});return()=>{active=false}};
  const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{
   try{const c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});c.width=24;c.height=24;ctx.drawImage(img,0,0,24,24);const px=ctx.getImageData(0,0,24,24).data;let sum=0,n=0;for(let i=0;i<px.length;i+=16){const r=px[i]/255,g=px[i+1]/255,b=px[i+2]/255;const f=x=>x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);sum+=.2126*f(r)+.7152*f(g)+.0722*f(b);n++}apply(sum/n)}catch(e){apply(.35)}};
  img.onerror=()=>apply(.35);img.src=url;
  return()=>{active=false};
 },[url,fallback]);
 return style;
}
function GiraAgendaCard({g,onOpen}){ return <UnifiedGiraCard g={g} mode="agenda" onOpen={onOpen}/>; }
const AGENDA_FILTERS=[['all','Todas'],['giras','Giras'],['desenvolvimento','Desenvolvimento'],['interna','Internas'],['festa','Festas'],['quintal','Quintal Ancestral'],['outros','Outros']];
const matchAgendaFilter=(g,f)=>f==='all'?true:f==='giras'?g.activity_type==='gira':['desenvolvimento','interna','festa','quintal'].includes(f)?g.activity_type===f:['evento','reuniao','outra'].includes(g.activity_type);
const AG_MONTHS=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const dayKey=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
// Agenda dos membros: calendário do mês + próximas giras do mês (as passadas só aparecem ao tocar no dia).
function Giras({p}){
 const now=new Date(),todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const[giras,setGiras]=useState([]),[loading,setLoading]=useState(true),[selected,setSelected]=useState(null),[filter,setFilter]=useState('all'),[ym,setYm]=useState({y:now.getFullYear(),m:now.getMonth()}),[day,setDay]=useState(null);
 useEffect(()=>{supabase.from('giras').select('*').eq('status','published').order('starts_at').then(({data})=>{setGiras(data||[]);setLoading(false)})},[]);
 if(selected)return <GiraDetail p={p} gira={selected} back={()=>setSelected(null)}/>;
 const filtered=giras.filter(g=>matchAgendaFilter(g,filter));
 const byDay={};filtered.forEach(g=>{(byDay[dayKey(new Date(g.starts_at))]??=[]).push(g)});
 const isUpcoming=g=>new Date(g.starts_at)>=todayStart;
 const inMonth=(g,y,m)=>{const d=new Date(g.starts_at);return d.getFullYear()===y&&d.getMonth()===m};
 const moveMonth=delta=>{setDay(null);setYm(v=>{const d=new Date(v.y,v.m+delta,1);return {y:d.getFullYear(),m:d.getMonth()}})};
 const goToday=()=>{setDay(null);setYm({y:now.getFullYear(),m:now.getMonth()})};
 const monthLabel=(y,m)=>AG_MONTHS[m][0].toUpperCase()+AG_MONTHS[m].slice(1)+(y!==now.getFullYear()?' de '+y:'');
 let listTitle,list,emptyText;
 if(day){list=byDay[dayKey(day)]||[];listTitle=day.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});emptyText='Nenhuma atividade neste dia.'}
 else{
  list=filtered.filter(g=>inMonth(g,ym.y,ym.m)&&isUpcoming(g));listTitle='Próximas em '+AG_MONTHS[ym.m];
  const isCurrentOrFuture=new Date(ym.y,ym.m+1,1)>todayStart;
  if(!list.length&&isCurrentOrFuture){const next=filtered.find(g=>isUpcoming(g)&&new Date(g.starts_at)>=new Date(ym.y,ym.m+1,1));if(next){const d=new Date(next.starts_at);list=filtered.filter(g=>inMonth(g,d.getFullYear(),d.getMonth())&&isUpcoming(g));listTitle='Próximas em '+AG_MONTHS[d.getMonth()]}}
  if(!isCurrentOrFuture)listTitle='Giras de '+AG_MONTHS[ym.m];
  emptyText=isCurrentOrFuture?'Nenhuma atividade prevista por enquanto.':'Este mês já passou. Toque em um dia marcado para ver o que aconteceu.';
 }
 const first=new Date(ym.y,ym.m,1).getDay(),days=new Date(ym.y,ym.m+1,0).getDate(),cells=[];
 for(let i=0;i<first;i++)cells.push(<span key={'e'+i}/>);
 for(let d=1;d<=days;d++){const dt=new Date(ym.y,ym.m,d),items=byDay[dayKey(dt)]||[],past=dt<todayStart,isToday=dayKey(dt)===dayKey(now),isSel=day&&dayKey(day)===dayKey(dt);
  cells.push(<button key={d} type="button" className={'ag-day'+(past?' is-past':'')+(isToday?' is-today':'')+(items.length?' has-gira':'')+(isSel?' is-selected':'')} disabled={!items.length} aria-pressed={!!isSel} aria-label={d+' de '+AG_MONTHS[ym.m]+(items.length?', '+items.length+' atividade(s)'+(past?' que já aconteceram':''):'')} onClick={()=>setDay(isSel?null:dt)}>{d}{items.length>0&&<i className="ag-dot"/>}</button>)}
 return <div className="ag-page">
  <div className="ag-head"><span className="eyebrow">AGENDA</span><h1>Giras e atividades</h1></div>
  <section className="ag-calendar card" aria-label="Calendário">
   <div className="ag-cal-top"><button type="button" className="ag-nav" aria-label="Mês anterior" onClick={()=>moveMonth(-1)}><ArrowLeft size={17}/></button><b className="ag-month">{monthLabel(ym.y,ym.m)}</b><button type="button" className="ag-nav" aria-label="Próximo mês" onClick={()=>moveMonth(1)}><ChevronRight size={18}/></button></div>
   <div className="ag-grid">{['D','S','T','Q','Q','S','S'].map((x,i)=><span className="ag-wd" key={i}>{x}</span>)}{cells}</div>
   <div className="ag-legend"><span><i className="ag-dot"/> Vai acontecer</span><span><i className="ag-dot is-past"/> Já aconteceu</span>{(ym.y!==now.getFullYear()||ym.m!==now.getMonth())&&<button type="button" className="ag-today" onClick={goToday}>Voltar para hoje</button>}</div>
  </section>
  <div className="gira-filters ag-filters">{AGENDA_FILTERS.map(([v,l])=><button key={v} className={filter===v?'active':''} onClick={()=>{setFilter(v);setDay(null)}}>{l}</button>)}</div>
  <div className="ag-list-head"><h2>{listTitle}</h2>{day&&<button type="button" className="ag-today" onClick={()=>setDay(null)}>Ver próximas</button>}</div>
  {loading?<div className="card muted">Carregando…</div>:list.length?<div className="gira-agenda-list">{list.map(g=><GiraAgendaCard key={g.id} g={g} onOpen={setSelected}/>)}</div>:<div className="card empty ag-empty">{emptyText}</div>}
 </div>}

// Mesma tela para o membro (dados reais) e para a prévia da Gestão da Casa (preview: dados do rascunho, interações só em memória).
function GiraDetail({p,gira,back,preview=null}){
 const isPreview=!!preview;
 const[subtasks,setSubtasks]=useState({}),[turnTaskNames,setTurnTaskNames]=useState({});
 const[resp,setResp]=useState(null),[turns,setTurns]=useState([]),[availability,setAvailability]=useState([]),[tasks,setTasks]=useState([]),[statuses,setStatuses]=useState({}),[exchanges,setExchanges]=useState([]),[notifications,setNotifications]=useState([]),[turnChangeNotifications,setTurnChangeNotifications]=useState([]),[turnAvailabilityNotifications,setTurnAvailabilityNotifications]=useState([]),[confirmedPeople,setConfirmedPeople]=useState([]),[turnPeople,setTurnPeople]=useState({}),[showConfirmed,setShowConfirmed]=useState(false),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[swap,setSwap]=useState({current:'',requested:[],message:''});
 const start=new Date(gira.starts_at),now=new Date(),hasTaskAgenda=!!gira.use_task_list,open=isPreview?hasTaskAgenda&&preview.phase==='choose':hasTaskAgenda&&now>=new Date(start.getTime()-10*86400000)&&(now<new Date(start.getTime()-3*86400000)||(gira.turn_availability_reopened_until&&now<new Date(gira.turn_availability_reopened_until))),released=isPreview?hasTaskAgenda&&preview.phase==='day':hasTaskAgenda&&now>=new Date(start.getTime()-3*86400000)&&!(gira.turn_availability_reopened_until&&now<new Date(gira.turn_availability_reopened_until));
 const formatShiftDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'}):'';
 const load=async()=>{
  if(isPreview)return;
  await supabase.rpc('expire_gira_exchange_requests');
  const[{data:r},{data:confirmed},{data:t},{data:a},{data:turnPeopleRows},{data:x},{data:n},{data:turnChanges},{data:availabilityNotifications}]=await Promise.all([
   supabase.from('gira_responses').select('*').eq('gira_id',gira.id).eq('profile_id',p.id).maybeSingle(),
   supabase.rpc('get_gira_confirmed_people',{p_gira_id:gira.id}),
   supabase.rpc('gira_turn_summary',{p_gira_id:gira.id}),
   supabase.from('gira_turn_availability').select('gira_turn_id').eq('profile_id',p.id),
   supabase.rpc('get_gira_turn_people',{p_gira_id:gira.id}),
   supabase.from('task_exchange_requests').select('*').eq('gira_id',gira.id).or('requester_id.eq.'+p.id+',accepted_by.eq.'+p.id).order('created_at',{ascending:false}),
   supabase.from('task_exchange_notifications').select('id,request_id,status,created_at').eq('recipient_id',p.id).eq('status','unread').order('created_at',{ascending:false}),
   supabase.rpc('get_my_gira_turn_change_notifications',{p_gira_id:gira.id}),
   supabase.rpc('get_my_gira_turn_availability_notifications',{p_gira_id:gira.id})
  ]);
  const turnRows=hasTaskAgenda?(t||[]):[];
  const ids=turnRows.map(v=>v.turn_id);
  const{data:turnDetails}=ids.length?await supabase.from('gira_turns').select('*').in('id',ids).order('sort_order'):({data:[]});
  const details=turnDetails||[];
  const merged=turnRows.map(x=>({...x,...(details.find(d=>d.id===x.turn_id)||{})}));
  setResp(r);setTurns(merged);setAvailability(hasTaskAgenda?(a||[]).map(v=>v.gira_turn_id):[]);setExchanges(x||[]);setNotifications(n||[]);setTurnChangeNotifications(turnChanges||[]);setTurnAvailabilityNotifications((availabilityNotifications||[]).filter(v=>!v.read_at));
  const confirmedPeopleRows=(confirmed||[]).map(v=>({id:v.profile_id,name:v.name}));
  setConfirmedPeople(confirmedPeopleRows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')));
  const groupedTurnPeople={};
  (turnPeopleRows||[]).forEach(v=>{(groupedTurnPeople[v.gira_turn_id]??=[]).push({id:v.profile_id,name:v.name});});
  Object.keys(groupedTurnPeople).forEach(k=>groupedTurnPeople[k].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')));
  setTurnPeople(groupedTurnPeople);
  if(hasTaskAgenda){const{data:names}=await supabase.from('tasks').select('id,name,gira_turn_id,sort_order').eq('gira_id',gira.id).order('sort_order');const tm={};(names||[]).forEach(v=>(tm[v.gira_turn_id]??=[]).push(v.name));setTurnTaskNames(tm)}else setTurnTaskNames({});
  if(released){const{data:ts}=await supabase.rpc('gira_turn_tasks',{p_gira_id:gira.id});setTasks(ts||[]);{const tids=(ts||[]).map(v=>v.id);if(tids.length){const{data:sb}=await supabase.from('gira_task_subtasks').select('id,task_id,title,sort_order').in('task_id',tids).order('sort_order');const sm={};(sb||[]).forEach(v=>(sm[v.task_id]??=[]).push(v));setSubtasks(sm)}else setSubtasks({})}const ids2=(ts||[]).map(v=>v.id);if(ids2.length){const{data:ss}=await supabase.from('task_status').select('task_id,done,completed_by,completed_at').in('task_id',ids2);const m={};(ss||[]).forEach(v=>m[v.task_id]=v);setStatuses(m)}else setStatuses({})}else{setTasks([]);setStatuses({})}
 };
 useEffect(()=>{if(!isPreview)return;const ts=preview.turns.map(t=>({...t,occupied:0,available:t.capacity,is_full:false}));setTurns(ts);setTasks(preview.tasks);const sm={},tm={};preview.tasks.forEach(t=>{sm[t.id]=(t.subtasks||[]).map(s=>({id:s.id,title:s.name}));(tm[t.gira_turn_id]??=[]).push(t.name)});setSubtasks(sm);setTurnTaskNames(tm);if(preview.phase==='day'){setResp({status:'going'});setAvailability(ts.map(t=>t.turn_id));setConfirmedPeople([{id:p.id,name:p.name||'Você'}])}},[]);
 useEffect(()=>{if(isPreview)return;load();const channel=supabase.channel('gira-capacity-'+gira.id).on('postgres_changes',{event:'*',schema:'public',table:'gira_turn_availability'},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'task_status'},()=>{if(released)load()}).subscribe();const timer=setInterval(load,open?3000:15000);return()=>{clearInterval(timer);supabase.removeChannel(channel)}},[gira.id,p.id,released]);
 const answer=async status=>{if(isPreview){setResp({status});if(status==='not_going')setAvailability([]);setConfirmedPeople(status==='going'?[{id:p.id,name:p.name||'Você'}]:[]);return}setBusy(true);setMsg('');const{data,error}=await supabase.from('gira_responses').upsert({gira_id:gira.id,profile_id:p.id,status},{onConflict:'gira_id,profile_id'}).select().single();if(error)setMsg(err(error));else{setResp(data);if(status==='not_going'){await supabase.from('gira_turn_availability').delete().eq('profile_id',p.id).in('gira_turn_id',turns.map(x=>x.turn_id));setAvailability([])}}setBusy(false);load()};
 const toggle=async id=>{if(isPreview){setAvailability(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);return}setMsg('');setBusy(true);const selected=availability.includes(id);const{error}=await supabase.rpc('set_gira_turn_availability',{p_gira_turn_id:id,p_available:!selected});if(error)setMsg(err(error));setBusy(false);load()};
 const toggleTask=async task=>{if(isPreview){setStatuses(v=>({...v,[task.id]:{done:!v[task.id]?.done}}));return}setBusy(true);const done=!!statuses[task.id]?.done;const{error}=await supabase.rpc('gira_turn_task_status',{p_task_id:task.id,p_done:!done});if(error)setMsg(err(error));setBusy(false);load()};
 const createSwap=async()=>{if(!swap.current||!swap.requested.length){setMsg('Selecione seu turno atual e pelo menos um horário desejado.');return}setBusy(true);const{error}=await supabase.rpc('create_gira_turn_exchange',{p_gira_id:gira.id,p_current_turn_id:swap.current,p_requested_turn_ids:swap.requested,p_message:swap.message});setMsg(error?err(error):'Solicitação de troca enviada. As pessoas dos horários escolhidos serão avisadas.');setBusy(false);setSwap({current:'',requested:[],message:''});load()};
 const acceptSwap=async id=>{setBusy(true);const{error}=await supabase.rpc('accept_gira_turn_exchange',{p_request_id:id});setMsg(error?err(error):'Troca realizada com sucesso.');setBusy(false);load()};
 const declineSwap=async id=>{await supabase.from('task_exchange_notifications').update({status:'removed'}).eq('request_id',id).eq('recipient_id',p.id);load()};
 const markTurnChangeRead=async id=>{await supabase.rpc('mark_gira_turn_change_notification_read',{p_notification_id:id});setTurnChangeNotifications(v=>v.filter(x=>x.id!==id))};
 const markTurnAvailabilityNotificationRead=async id=>{await supabase.rpc('mark_gira_turn_availability_notification_read',{p_notification_id:id});setTurnAvailabilityNotifications(v=>v.filter(x=>x.id!==id))};
 const availableLabel=t=>`${t.occupied}/${t.capacity} pessoas`;
 const taskGroups={};tasks.forEach(t=>(taskGroups[t.gira_turn_id]??=[]).push(t));
 const myTurns=turns.filter(t=>availability.includes(t.turn_id));
 const fullAlternatives=turns.filter(t=>t.is_full&&!availability.includes(t.turn_id));
 const isAnyShiftToday=myTurns.some(t=>t.shift_date===new Date().toISOString().slice(0,10));
 const cover=useReadableCover(gira.art_path,gira.cover_color||'#65745a');
 const coverStyle={'--gira-cover-image':gira.art_path?`url("${gira.art_path}")`:'none','--gira-cover-color':gira.cover_color||'#65745a','--gira-text-color':cover.color,'--gira-cover-overlay':cover.overlay};
 return <div>
  {!isPreview&&<button className="btn gira-detail-back" onClick={back}><ArrowLeft size={15}/> Todas as giras</button>}
  <section className={'gira-public-hero '+(gira.art_path?'has-cover':'no-cover')} style={coverStyle}>
   <div className="gira-public-hero-content">
    <span className="activity-tag gira-public-tag">{typeLabel(gira.activity_type)}</span>
    <h1>{gira.name}</h1>
    <div className="gira-public-meta"><span><CalendarDays size={16}/>{new Date(gira.starts_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</span><span><span className="gira-meta-clock">◷</span>{new Date(gira.starts_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>
    {gira.entity_lines?.length>0&&<div className="gira-public-entities">{gira.entity_lines.map(id=>{const x=lineInfo(id);return x?<span key={id}>{x[1]} {x[2]}</span>:null})}</div>}
   </div>
  </section>
  {msg&&<div className="toast">{msg}</div>}
  {turnChangeNotifications.filter(x=>!x.read_at).map(n=><div className="card gira-turn-change-notice" key={n.id}><div className="row between"><div><span className="eyebrow">ALTERAÇÃO DE TURNO</span><h3>Seu turno foi alterado</h3><p className="muted">{n.message}</p></div><button className="btn" onClick={()=>markTurnChangeRead(n.id)}>Entendi</button></div></div>)}
  {turnAvailabilityNotifications.map(n=><div className="card gira-turn-change-notice" key={n.id}><div className="row between"><div><span className="eyebrow">AVISO DA GIRA</span><h3>Novidade nesta gira</h3><p className="muted">{n.message}</p></div><button className="btn" onClick={()=>markTurnAvailabilityNotificationRead(n.id)}>Entendi</button></div></div>)}
  <div className="gira-public-confirmed-link"><button className="gira-confirmed-btn" onClick={()=>setShowConfirmed(true)}><Users size={14}/> Veja quem já confirmou <span>{confirmedPeople.length}</span></button></div>
  <div className="gira-public-actions"><button className={'btn '+(resp?.status==='going'?'primary is-selected going':'')} disabled={busy} onClick={()=>answer('going')}><Check size={15}/> {resp?.status==='going'?'Confirmado: vou participar':'Vou participar'}</button><button className={'btn '+(resp?.status==='not_going'?'is-selected not-going':'')} disabled={busy} onClick={()=>answer('not_going')}><X size={15}/> {resp?.status==='not_going'?'Confirmado: não vou':'Não vou participar'}</button></div>{resp?.status&&<div className={'gira-response-confirmation '+resp.status}><Check size={16}/><span><b>{resp.status==='going'?'Presença confirmada.':'Resposta registrada.'}</b> {resp.status==='going'?'Você marcou que vai participar desta gira.':'Você marcou que não vai participar desta gira.'}</span></div>}
  <div className="gira-public-overview">
   {(gira.contribution_amount>0||gira.contribution_due_date)&&<div className="gira-public-info-card"><span className="gira-public-info-icon">◉</span><div><span className="eyebrow">CONTRIBUIÇÃO</span><strong>{Number(gira.contribution_amount)>0?money(gira.contribution_amount):'Valor a confirmar'}</strong>{gira.contribution_due_date&&<small>Vencimento {new Date(gira.contribution_due_date+'T12:00:00').toLocaleDateString('pt-BR')}</small>}</div></div>}
   {gira.entity_lines?.length>0&&<div className="gira-public-info-card"><span className="gira-public-info-icon">♧</span><div><span className="eyebrow">ENTIDADES DA GIRA</span><div className="gira-public-chip-list">{gira.entity_lines.map(id=>{const x=lineInfo(id);return x?<span key={id}>{x[1]} {x[2]}</span>:null})}</div></div></div>}
  </div>
  {gira.what_to_bring&&<div className="card gira-public-section"><div className="gira-public-section-title"><span>👜</span><div><span className="eyebrow">O QUE LEVAR</span><h3>Prepare-se para a Gira</h3></div></div><p className="gira-public-preserve">{gira.what_to_bring}</p></div>}
  {gira.notes&&<div className="card gira-public-section"><div className="gira-public-section-title"><span>💬</span><div><span className="eyebrow">OBSERVAÇÕES</span><h3>Informações importantes</h3></div></div><p className="gira-public-preserve">{gira.notes}</p></div>}
  {resp?.status==='going'&&hasTaskAgenda&&<div className="card"><span className="eyebrow">DISPONIBILIDADE</span>{open?<><h3>Marque um ou mais turnos em que você pode participar.</h3><p className="muted small">A capacidade é atualizada conforme outras pessoas fazem suas escolhas.</p><div className="turn-choice-grid">{turns.map(t=>{const selected=availability.includes(t.turn_id),full=t.is_full&&!selected;return <button key={t.turn_id} className={'btn '+(selected?'primary':'')} disabled={busy||full} onClick={()=>toggle(t.turn_id)}><b>{t.label}</b><small>{formatShiftDate(t.shift_date)}</small>{(turnTaskNames[t.turn_id]||[]).length>0&&<small className="gira-turn-task-names">{turnTaskNames[t.turn_id].join(' · ')}</small>}<span>{full?'COMPLETO':availableLabel(t)}</span></button>})}</div></>:released?<><h3>A disponibilidade está encerrada.</h3>{!availability.length?<div className="deadline-message">⚠️ <b>O prazo para informar sua disponibilidade terminou.</b><p>A organização da gira já está fechando os turnos e distribuindo as tarefas.</p><p>Como sua disponibilidade não foi informada dentro desse momento, não é mais possível fazer essa marcação pelo aplicativo.</p><p><b>Entre em contato diretamente com os Pais de Santo para verificar como proceder.</b></p></div>:<p className="muted">Sua disponibilidade foi registrada. Os turnos e as tarefas agora estão em organização.</p>}</>:<><h3>A disponibilidade ainda não abriu.</h3><p className="muted">A disponibilidade abre exatamente 10 dias antes da gira.</p></>}</div>}
  {released&&resp?.status==='going'&&<div className="card"><span className="eyebrow">ACOMPANHAR TAREFAS</span><p className="muted small">As tarefas são coletivas: todas as pessoas do mesmo turno acompanham o mesmo progresso.</p>{myTurns.map(turn=>{const list=taskGroups[turn.turn_id]||[],done=list.filter(t=>statuses[t.id]?.done).length,isTurnToday=isPreview||turn.shift_date===new Date().toISOString().slice(0,10);return <div className="card" key={turn.turn_id}><div className="row between"><div><span className="eyebrow">SEU TURNO</span><h3>{turn.label}</h3><span className="muted small">{formatShiftDate(turn.shift_date)}</span></div><span className="pill">{done}/{list.length} · {list.length?Math.round(done/list.length*100):0}%</span></div><div className="gira-turn-people"><span className="muted small">Com você neste turno</span><div className="gira-turn-people-list">{(turnPeople[turn.turn_id]||[]).map(person=><span key={person.id} className={person.id===p.id?'gira-turn-person me':''}>{person.name}{person.id===p.id?' (você)':''}</span>)}</div></div>{!isTurnToday&&<p className="muted">As tarefas serão acompanhadas no dia deste turno.</p>}{list.map(task=><button key={task.id} className={'list-item row between '+(statuses[task.id]?.done?'task-done':'')} disabled={!isTurnToday||busy} onClick={()=>toggleTask(task)}><span><b>{task.name}</b>{task.instructions&&<small className="muted">{task.instructions}</small>}{(subtasks[task.id]||[]).length>0&&<ul className="gira-subtasks">{subtasks[task.id].map(s=><li key={s.id}>{s.title}</li>)}</ul>}</span><span>{statuses[task.id]?.done?'✓ Concluída':'○'}</span></button>)}{!list.length&&<p className="muted small">Nenhuma tarefa cadastrada para este turno.</p>}</div>})}</div>}
  {showConfirmed&&<div className="modal-back" onClick={()=>setShowConfirmed(false)}><div className="modal gira-confirmed-modal" onClick={e=>e.stopPropagation()}><div className="row between"><div><span className="eyebrow">PRESENÇAS</span><h3>Quem já confirmou</h3><p className="muted small">{confirmedPeople.length} {confirmedPeople.length===1?'pessoa confirmou':'pessoas confirmaram'} presença nesta atividade.</p></div><button className="btn" onClick={()=>setShowConfirmed(false)}>Fechar</button></div>{confirmedPeople.length?<div className="gira-confirmed-list">{confirmedPeople.map(person=><div className="gira-confirmed-person" key={person.id}><Users size={15}/><span>{person.name}{person.id===p.id?' <b>(você)</b>':''}</span></div>)}</div>:<div className="empty"><p>Ninguém confirmou presença ainda.</p></div>}</div></div>}
  {open&&resp?.status==='going'&&fullAlternatives.length>0&&<div className="card"><span className="eyebrow">TROCA DE HORÁRIO</span><h3>Tentar trocar de horário</h3><p className="muted small">Se o horário que você precisa estiver completo, você pode pedir uma troca. A solicitação fica aberta por no máximo 3 dias.</p><Field label="Seu turno atual"><select className="select" value={swap.current} onChange={e=>setSwap(v=>({...v,current:e.target.value,requested:[]}))}><option value="">Selecione</option>{myTurns.map(t=><option value={t.turn_id} key={t.turn_id}>{t.label}</option>)}</select></Field><Field label="Horários completos desejados"><div className="choice">{fullAlternatives.filter(t=>t.turn_id!==swap.current).map(t=><button type="button" className={'btn '+(swap.requested.includes(t.turn_id)?'primary':'')} key={t.turn_id} onClick={()=>setSwap(v=>({...v,requested:v.requested.includes(t.turn_id)?v.requested.filter(x=>x!==t.turn_id):[...v.requested,t.turn_id]}))}>{t.label}</button>)}</div></Field><Field label="Mensagem opcional"><textarea className="textarea" value={swap.message} onChange={e=>setSwap(v=>({...v,message:e.target.value}))}/></Field><button className="btn primary" disabled={busy||!swap.current||!swap.requested.length} onClick={createSwap}>Tentar trocar de horário</button></div>}
  {notifications.map(n=>{const x=exchanges.find(e=>e.id===n.request_id);if(!x||x.status!=='open')return null;const requested=turns.filter(t=>x.requested_turn_ids?.includes(t.turn_id));return <div className="card" key={n.id}><span className="eyebrow">TROCA DISPONÍVEL</span><h3>🔄 Uma pessoa gostaria de trocar de horário com você</h3><p className="muted">Ela precisa de uma vaga em outro turno.</p>{requested.length>0&&<div className="list">{requested.map(t=><div className="list-item" key={t.turn_id}><b>{t.label}</b><small className="muted">{formatShiftDate(t.shift_date)}</small></div>)}</div>}{x.message&&<p>{x.message}</p>}<div className="choice"><button className="btn primary" disabled={busy} onClick={()=>acceptSwap(x.id)}>Aceitar troca</button><button className="btn" disabled={busy} onClick={()=>declineSwap(x.id)}>Recusar</button></div></div>})}
  {exchanges.filter(x=>x.requester_id===p.id&&(x.status==='open'||x.status==='expired'||x.status==='accepted')).map(x=>x.status==='open'?<div className="card" key={'out-'+x.id}><span className="eyebrow">TROCA EM ANDAMENTO</span><p className="muted">Sua solicitação de troca está aguardando alguém assumir. O prazo é de até 3 dias.</p></div>:x.status==='accepted'?<div className="card" key={'out-'+x.id}><span className="eyebrow">TROCA CONCLUÍDA</span><p>✓ A troca foi realizada com sucesso.</p></div>:<div className="card" key={'out-'+x.id}><span className="eyebrow">TROCA ENCERRADA</span><p>⚠️ <b>Não foi possível realizar sua troca.</b></p><p className="muted">Ninguém conseguiu assumir a troca dentro do prazo. Converse com os Pais de Santo para verificar outra possibilidade.</p></div>)}
 </div>
}
function Birthday(){const[people,setPeople]=useState([]);useEffect(()=>{const now=new Date(),month=now.getMonth()+1,day=now.getDate();supabase.from('profiles').select('id,name,date_of_birth,orixa_symbol').eq('is_active',true).then(({data})=>setPeople((data||[]).filter(x=>{if(!x.date_of_birth)return false;const d=new Date(x.date_of_birth+'T12:00:00');return d.getMonth()+1===month&&d.getDate()>=day})));},[]);if(!people.length)return null;return <div className="birthday-section"><div className="birthday-card"><div className="birthday-head"><div><span className="eyebrow">ANIVERSARIANTES DO MÊS</span><h3>Quem faz aniversário por aqui.</h3><p className="muted small">A casa celebra quem está chegando ao seu dia.</p></div><span className="birthday-emoji">🎂</span></div><div className="birthday-list">{people.map(x=><div className="birthday-person" key={x.id}><div className="birthday-orixa"><OrixaIcon name={x.orixa_symbol} size={42}/></div><div><b>{x.name}</b><span>{new Date(x.date_of_birth+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}</span></div></div>)}</div></div></div>}
function Community({p}){const[posts,setPosts]=useState([]),[giras,setGiras]=useState([]),[feed,setFeed]=useState('ensinamento'),[body,setBody]=useState(''),[editing,setEditing]=useState(null),[msg,setMsg]=useState(''),[composing,setComposing]=useState(false),[saving,setSaving]=useState(false);const load=async()=>{const{data}=await supabase.from('community_posts').select('*').order('created_at',{ascending:false});if(!data){setPosts([]);return}const ids=[...new Set(data.map(x=>x.author_id))],gs=[...new Set(data.map(x=>x.gira_id).filter(Boolean))];const[{data:pr},{data:gr}]=await Promise.all([ids.length?supabase.from('profiles').select('id,name,orixa_symbol').in('id',ids):{data:[]},gs.length?supabase.from('giras').select('id,name,starts_at').in('id',gs):{data:[]}]);const pm=Object.fromEntries((pr||[]).map(x=>[x.id,x])),gm=Object.fromEntries((gr||[]).map(x=>[x.id,x]));setPosts(data.map(x=>({...x,author:pm[x.author_id],gira:gm[x.gira_id]})))};useEffect(()=>{load();supabase.from('giras').select('id,name,starts_at').eq('status','published').order('starts_at',{ascending:false}).then(({data})=>setGiras(data||[]))},[]);const isGira=feed.startsWith('gira:'),activeGira=isGira?feed.slice(5):null;const save=async e=>{e.preventDefault();if(!body.trim()||!feed){setMsg('Escolha um feed e escreva sua publicação.');return}const giraId=isGira?activeGira:null;const postKind=isGira?(editing?posts.find(x=>x.id===editing)?.kind||'reflexao':'reflexao'):feed;const payload={kind:postKind,body:body.trim(),gira_id:giraId};const q=editing&&(p.role==='admin'||p.role==='editor')?supabase.rpc('editor_update_community_post',{p_id:editing,p_kind:postKind,p_body:body.trim(),p_gira_id:giraId}):editing?supabase.from('community_posts').update(payload).eq('id',editing).eq('author_id',p.id):supabase.from('community_posts').insert({...payload,author_id:p.id});setSaving(true);const{error}=await q;setSaving(false);if(error)setMsg(err(error));else{setBody('');setEditing(null);setMsg('');setComposing(false);load()}};const remove=async id=>{if(!confirm('Excluir esta publicação?'))return;const{error}=await((p.role==='admin'||p.role==='editor')?supabase.rpc('editor_delete_community_post',{p_id:id}):supabase.from('community_posts').delete().eq('id',id));if(error)setMsg(err(error));else load()};const shown=posts.filter(x=>isGira?x.gira_id===activeGira:x.kind===feed);const feedLabel=isGira?(giras.find(g=>g.id===activeGira)?.name||'Gira'):kinds.find(k=>k[0]===feed)?.[1]||feed;const ago=d=>{if(!d)return 'agora';const m=Math.floor((Date.now()-new Date(d))/60000);if(m<1)return 'agora';if(m<60)return 'há '+m+' min';const h=Math.floor(m/60);if(h<24)return 'há '+h+' h';const dd=Math.floor(h/24);return dd===1?'ontem':dd<7?'há '+dd+' dias':new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})};const cancel=()=>{setEditing(null);setBody('');setMsg('');setComposing(false)};
 return <div className="mu">
  <div className="mu-head"><span className="eyebrow">NOSSA COMUNIDADE</span><h1>Mural</h1><p className="muted">O que a comunidade está compartilhando</p></div>
  <div className="mu-chips" role="tablist" aria-label="Espaços do mural">{kinds.map(([v,l])=><button type="button" role="tab" aria-selected={feed===v} className={'mu-chip'+(feed===v?' is-on':'')} key={v} onClick={()=>{setFeed(v);cancel()}}>{l}</button>)}
   {giras.length>0&&<select className={'mu-chip mu-gira-select'+(isGira?' is-on':'')} aria-label="Mural de uma gira" value={isGira?feed:''} onChange={e=>{if(e.target.value){setFeed(e.target.value);cancel()}}}><option value="">🌿 Giras…</option>{giras.map(g=><option value={'gira:'+g.id} key={g.id}>{g.name} · {new Date(g.starts_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</option>)}</select>}
  </div>
  {!composing&&!editing?<button type="button" className="mu-compose-closed" onClick={()=>setComposing(true)}><Pencil size={16}/><span>Escreva em <b>{feedLabel}</b>…</span></button>
  :<form className="mu-compose" onSubmit={save}><label className="sr-only" htmlFor="mu-text">Texto</label><textarea id="mu-text" autoFocus className="textarea" rows="4" value={body} onChange={e=>setBody(e.target.value)} placeholder="Escreva para a comunidade…"/><div className="mu-compose-foot"><small className="muted">{editing?'Editando publicação':'Publicando em '+feedLabel+' · com seu nome e Orixá'}</small><div className="row"><button type="button" className="btn" onClick={cancel}>Cancelar</button><button className="btn primary" disabled={saving||!body.trim()}>{saving?'Enviando…':editing?'Salvar':'Publicar'}</button></div></div>{msg&&<div className="toast">{msg}</div>}</form>}
  <div className="mu-feed">{shown.map(post=><Post key={post.id} post={post} p={p} ago={ago} edit={()=>{setEditing(post.id);setComposing(true);setFeed(post.gira_id?'gira:'+post.gira_id:post.kind);setBody(post.body);window.scrollTo({top:0,behavior:'smooth'})}} remove={()=>remove(post.id)}/>)}{!shown.length&&<div className="mu-empty">Ninguém escreveu aqui ainda. Que tal ser a primeira pessoa?</div>}</div>
 </div>}

function Post({post,p,edit,remove,ago}){const canEdit=post.author_id===p.id,canManage=p.role==='admin'||p.role==='editor',canDelete=canEdit||canManage;return <article className="mu-post"><header className="mu-post-head"><OrixaIcon name={post.author?.orixa_symbol} size={34}/><div className="mu-post-who"><b>{post.author?.name||'Membro'}</b><small>{ago?ago(post.created_at):''}{!post.gira&&kinds.find(k=>k[0]===post.kind)?' · '+kinds.find(k=>k[0]===post.kind)[1]:''}{post.gira?' · 🌿 '+post.gira.name:''}</small></div></header><p className="mu-post-body">{post.body}</p>{(canEdit||canDelete)&&<div className="mu-post-actions">{(canEdit||canManage)&&<button type="button" onClick={edit}><Pencil size={13}/> Editar</button>}{canDelete&&<button type="button" className="is-danger" onClick={remove}><Trash2 size={13}/> Excluir</button>}</div>}</article>}

function InstallApp(){const[deferred,setDeferred]=useState(null),[show,setShow]=useState(false);useEffect(()=>{const h=e=>{e.preventDefault();setDeferred(e)};window.addEventListener('beforeinstallprompt',h);return()=>window.removeEventListener('beforeinstallprompt',h)},[]);const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;const install=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;setDeferred(null)}else setShow(true)};return <><button className="card list-item row between" onClick={install}><span className="row"><Download size={17}/> Adicionar à tela inicial</span><ChevronRight size={17}/></button>{show&&<div className="install-help"><div className="install-help-card"><div className="row between"><h3>Adicionar o TPBC ao celular</h3><button className="btn" onClick={()=>setShow(false)}>Fechar</button></div>{ios?<p>1. Abra o TPBC no <b>Safari</b>.<br/>2. Toque em <b>Compartilhar</b>.<br/>3. Escolha <b>Adicionar à Tela de Início</b>.<br/>4. Toque em <b>Adicionar</b>.</p>:<p>1. Abra o TPBC no <b>Chrome</b>.<br/>2. Toque no menu <b>⋮</b>.<br/>3. Escolha <b>Adicionar à tela inicial</b> ou <b>Instalar app</b>.<br/>4. Confirme.</p>}<p className="muted small">Depois disso, o TPBC aparecerá junto dos seus aplicativos e poderá abrir em formato de aplicativo.</p></div></div>}</>}

function Me({p,go,logout,memberPreview=false}){const[tab,setTab]=useState('menu');if(tab==='profile')return <Profile p={p} back={()=>setTab('menu')}/>;if(tab==='finance')return <Finance p={p} back={()=>setTab('menu')}/>;const orixa=p.orixa_symbol||'oxala';const roleLabel=p.role==='admin'?'Administrador':p.role==='editor'?'Editor':'Membro';const group=p.groups?.name||'Organização';return <div className={'me-page me-orixa-'+orixa}><div className="me-intro"><div><span className="eyebrow">EU</span><h1>Meu perfil</h1><p>Minha caminhada também faz parte da casa.</p></div><OrixaIcon name={orixa} size={42}/></div><div className="me-card"><div className="me-card-orixa"><div className="me-card-orixa-art"><OrixaIcon name={orixa} size={106}/></div><strong>{ORIXAS.find(x=>x[0]===orixa)?.[1]||'Orixá'}</strong><span>MINHA CAMINHADA</span></div><div className="me-card-main"><span className="me-card-house">TERREIRO PAI BENEDITO DO CONGO</span><h2>{p.name}</h2><p className="me-card-group">{group}</p><span className="me-card-role">{roleLabel}</span><div className="me-card-rule"></div><p className="me-card-quote">“Caminho com meus Orixás, construo com minha comunidade.”</p></div><div className="me-card-side"><span>AXÉ</span><span>DISCIPLINA</span><span>MOVIMENTO</span><span>CONHECIMENTO</span></div></div><div className="me-section-head"><h2>Minha vida na casa</h2><p>Acompanhe sua jornada, suas participações e sua contribuição.</p></div><div className="me-shortcuts">{!p?.is_pai_de_santo&&<button className="me-shortcut" onClick={()=>setTab('finance')}><WalletCards/><span><b>Meu financeiro</b><small>Mensalidades e contribuições</small></span><ChevronRight/></button>}<button className="me-shortcut" onClick={()=>setTab('profile')}><UserRound/><span><b>Meus dados</b><small>Informações pessoais e minha jornada</small></span><ChevronRight/></button><button className="me-shortcut" onClick={()=>go('giras')}><CalendarDays/><span><b>Minhas giras</b><small>Veja suas participações e tarefas</small></span><ChevronRight/></button><button className="me-shortcut" onClick={()=>go('content')}><BookOpen/><span><b>Conteúdos da casa</b><small>Textos, avisos e materiais</small></span><ChevronRight/></button></div><div className="me-section-head me-other-head"><h2>Outras opções</h2><p>Configurações e recursos do aplicativo.</p></div><div className="me-options">{!memberPreview&&(p.role==='admin'||p.role==='editor'||p.is_finance_manager)&&<button onClick={()=>go('admin')}><ShieldCheck/><span><b>Gestão da casa</b><small>Gerencie pessoas, giras e conteúdos</small></span><ChevronRight/></button>}<InstallApp/><button onClick={logout}><LogOut/><span><b>Sair</b><small>Encerrar minha sessão</small></span><ChevronRight/></button></div></div>}

function ContactParents({back}){const[question,setQuestion]=useState(''),[items,setItems]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const load=async()=>{const {data,error}=await supabase.rpc('my_house_questions');if(!error)setItems(data||[])};useEffect(()=>{load()},[]);
 const send=async e=>{e.preventDefault();if(!question.trim())return;setBusy(true);setMessage('');const {error}=await supabase.rpc('submit_house_question',{p_question:question.trim(),p_is_anonymous:false});if(error)setMessage(err(error));else{setQuestion('');setMessage('Mensagem enviada. Você poderá acompanhar a leitura e a resposta aqui.');load()}setBusy(false)};
 return <div><button className="btn" onClick={back}><ArrowLeft size={15}/> Voltar</button><div className="section-heading"><div><span className="eyebrow">FALA COM A CASA</span><h2>Contato com os Pais</h2><p className="muted">Envie uma dúvida, pedido ou assunto diretamente para os Pais da Casa.</p></div></div><div className="card"><form onSubmit={send}><Field label="Mensagem"><textarea className="textarea" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Escreva sua mensagem…" rows="6" required/></Field>{message&&<div className="toast">{message}</div>}<button className="btn primary" disabled={busy}>{busy?'Enviando…':'Enviar mensagem'}</button></form></div><div className="section-heading"><div><span className="eyebrow">ACOMPANHAMENTO</span><h3>Minhas mensagens</h3></div></div>{!items.length?<div className="card empty">Você ainda não enviou nenhuma mensagem.</div>:items.map(x=><div className="card" key={x.id}><div className="row between"><span className="pill">{x.is_anonymous?'ANÔNIMA':'IDENTIFICADA'}</span><span className="muted small">{new Date(x.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</span></div><p style={{whiteSpace:'pre-wrap'}}>{x.question}</p><div className="muted small">{x.read_at?'✓ Lida pela casa':'○ Ainda não lida'} · {x.answer?'✓ Respondida':'○ Aguardando resposta'}</div>{x.answer&&<div className="card" style={{marginTop:12,background:'#f1f5ed'}}><b>Resposta dos Pais da Casa</b><p style={{whiteSpace:'pre-wrap'}}>{x.answer}</p></div>}</div>)}</div>}

function Profile({p,back}){const[name,setName]=useState(p.name),[dob,setDob]=useState(p.date_of_birth||''),[orixa,setOrixa]=useState(p.orixa_symbol),[group,setGroup]=useState(p.groups?.name||'Organização'),[message,setMessage]=useState('');const save=async()=>{const {error}=await supabase.rpc('update_my_profile',{p_name:name,p_date_of_birth:dob,p_orixa_symbol:orixa,p_group_name:group});setMessage(error?err(error):'Perfil atualizado.')};return <div><button className="btn" onClick={back}><ArrowLeft size={15}/> Eu</button><div className="card"><h2>Meu perfil</h2><p className="muted small">Você pode atualizar seus dados pessoais e sua identificação na casa.</p><Field label="Nome"><input className="input" value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Data de nascimento"><input className="input" type="date" value={dob} onChange={e=>setDob(e.target.value)}/></Field><Field label="Orixá"><select className="select" value={orixa} onChange={e=>setOrixa(e.target.value)}>{ORIXAS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field><Field label="Grupo"><select className="select" value={group} onChange={e=>setGroup(e.target.value)}>{groups.map(g=><option key={g}>{g}</option>)}</select></Field>{message&&<div className="toast">{message}</div>}<button className="btn primary" onClick={save}><Save size={14}/> Salvar alterações</button></div></div>}function Finance({p,back}){const fin=useMemberFinance(p),[payOpen,setPayOpen]=useState(false);const[dues,setDues]=useState([]),[charges,setCharges]=useState([]),[loading,setLoading]=useState(true),[showAll,setShowAll]=useState(false);const load=async()=>{setLoading(true);const [{data:d},{data:c}]=await Promise.all([supabase.from('monthly_dues').select('*').eq('profile_id',p.id).order('reference_month',{ascending:false}),supabase.from('extra_charges').select('*').eq('profile_id',p.id).order('due_date',{ascending:false})]);setDues(d||[]);setCharges(c||[]);setLoading(false)};useEffect(()=>{load()},[p.id]);const key=x=>String(x).slice(0,7);const monthLabel=x=>new Date(x+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});const ymOffset=(base,n)=>{const d=new Date(base+'-01T12:00:00');d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,7)};const today=new Date();const current=today.toISOString().slice(0,7);const baseMonths=[ymOffset(current,-1),current,ymOffset(current,1),ymOffset(current,2)];const overdue=dues.filter(x=>x.status!=='paid'&&x.status!=='not_applicable'&&key(x.reference_month)<ymOffset(current,-1)).map(x=>key(x.reference_month));const visible=[...new Set([...overdue,...baseMonths])].sort((a,b)=>a.localeCompare(b));const allMonths=[...new Set([...dues.map(x=>key(x.reference_month)),current,ymOffset(current,1),ymOffset(current,2)])].sort((a,b)=>a.localeCompare(b));const months=showAll?allMonths:visible;const statusFor=m=>{const d=dues.find(x=>key(x.reference_month)===m);if(d?.status==='paid')return'paid';if(d?.status==='not_applicable')return'not_applicable';if(fin.proofs.some(x=>x.status==='pending'&&x.kind==='monthly'&&String(x.reference_month).slice(0,7)===m))return'review';if(m<current||(m===current&&today.getDate()>=fin.settings.due_day))return'overdue';return'open'};const statusText=s=>s==='paid'?'Pago':s==='not_applicable'?'Não se aplica':s==='overdue'?'Atrasado':s==='review'?'Em análise':'Em aberto';return <div><button className="btn" onClick={back}><ArrowLeft size={15}/> Eu</button><div className="row between"><div><span className="eyebrow">MEU FINANCEIRO</span><h2>Financeiro</h2></div><div className="row"><button className="btn primary" onClick={()=>setPayOpen(true)}>Como pagar</button><button className="btn" onClick={()=>{load();fin.reload()}} aria-label="Atualizar"><RefreshCw size={14}/></button></div></div>{payOpen&&<PayModal p={p} settings={fin.settings} items={fin.items} onClose={()=>setPayOpen(false)} onSent={()=>{fin.reload();load()}}/>}{loading?<div className="card muted">Carregando…</div>:<><div className="card"><div className="row between finance-member-heading"><div><h3>Mensalidades</h3><p className="muted small">Acompanhe suas mensalidades, pagamentos e vencimentos.</p></div><button className="btn finance-see-all" onClick={()=>setShowAll(v=>!v)}>{showAll?'Ver menos':'Ver todas'}</button></div><div className="finance-member-months">{months.map(m=>{const status=statusFor(m);return <div className={'finance-member-month '+status} key={m}><div><b>{monthLabel(m)}</b><div className="muted small">{status==='overdue'?'Em atraso':status==='open'?'Vencimento atual':status==='not_applicable'?'Não se aplica':m>current?'Próximo vencimento':'Pago'}</div></div><span className={'finance-status-btn '+status}><span className="finance-status-dot"></span>{statusText(status)}</span></div>})}</div>{!showAll&&<p className="muted small finance-history-hint">Mostrando atrasados, o mês atual e os próximos vencimentos. Toque em “Ver todas” para consultar todo o histórico.</p>}</div><div className="card"><h3>Outras cobranças</h3>{charges.length?charges.map(x=><div className="list-item" key={x.id}><div className="row between"><b>{x.description}</b><b>{money(x.amount)}</b></div><div className="muted small">{x.due_date?'Vencimento '+new Date(x.due_date+'T12:00:00').toLocaleDateString('pt-BR'):'Sem vencimento'} · {x.status==='paid'?'Pago':'Não pago'}</div></div>):<p className="muted">Nenhuma outra cobrança.</p>}</div></>}</div>}
function House({back}){const[items,setItems]=useState([]);const labels={rule:'Regra da casa',orientation:'Orientação',important:'Informação importante'};const cleanHtml=html=>String(html||'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<([a-z]+)\s+[^>]*>/gi,'<$1>');const textToHtml=t=>String(t||'').split(/\n\n+/).map(x=>'<p>'+x.replace(/\n/g,'<br>')+'</p>').join('');useEffect(()=>{supabase.from('house_contents').select('*').order('sort_order').then(({data})=>setItems(data||[]));supabase.rpc('touch_my_last_seen')},[]);return <div className="house-info"><button className="btn" onClick={back}><ArrowLeft size={15}/> Eu</button><div className="section-heading house-info-heading"><div><span className="eyebrow">NOSSA CASA</span><h2>Informações da casa</h2><p className="muted">Regras e orientações permanentes da casa.</p></div></div>{!items.length?<div className="card empty">Nenhum conteúdo publicado.</div>:<div className="house-content-list">{items.map((x,i)=><article className="house-content-card" key={x.id}><div className="house-content-top"><span className="content-kind">{labels[x.content_type]||'Informação'}</span><span className="content-number">{String(i+1).padStart(2,'0')}</span></div><h3>{x.title}</h3>{x.tags?.length>0&&<div className="content-tags">{x.tags.map(t=><span className="content-tag" key={t}>{t}</span>)}</div>}<div className="house-content-body" dangerouslySetInnerHTML={{__html:cleanHtml(/<[a-z][\s\S]*>/i.test(x.body||'')?x.body:textToHtml(x.body))}}/></article>)}</div>}</div>}

function ProfileMenu({setTab,p}){return <div><button className="btn" onClick={()=>setTab('menu')}><ArrowLeft size={15}/> Eu</button><div className="section-heading"><div><span className="eyebrow">MEU PERFIL</span><h2>Meu Perfil</h2><p className="muted">Acesse suas informações pessoais e seu financeiro.</p></div></div><div className="list">{!p?.is_pai_de_santo&&<button className="card list-item row between" onClick={()=>setTab('finance')}><span className="row"><WalletCards/> Meu financeiro</span><ChevronRight size={17}/></button>}<button className="card list-item row between" onClick={()=>setTab('profile')}><span className="row"><UserRound/> Meu perfil</span><ChevronRight size={17}/></button></div></div>}

function Admin({p}){/* Funções: Administrador master (role admin) faz tudo; Editor (role editor) cuida de giras e conteúdos; Responsável pelo financeiro (is_finance_manager) só o financeiro. */const master=p?.role==='admin',editor=!master&&p?.role==='editor',finance=!master&&!!p?.is_finance_manager;const nav=master?[['overview','Visão'],['people','Pessoas'],['giras','Giras'],['finance','Financeiro'],['invites','Convites'],['content','Conteúdos'],['questions','Dúvidas']]:[...(editor?[['giras','Giras'],['content','Conteúdos']]:[]),...(finance?[['finance','Financeiro']]:[])];const[tab,setTab]=useState(nav[0]?.[0]||'overview');const allowed=nav.some(([id])=>id===tab);const title=master||editor?'Gestão da Casa':'Gestão Financeira';const subtitle=master?'Pessoas, giras, tarefas, financeiro e conteúdos':editor&&finance?'Giras, conteúdos e financeiro':editor?'Giras e conteúdos':'Mensalidades e cobranças';if(!master&&!editor&&!finance)return null;return <div><div className="card" style={{marginBottom:12}}><div className="row"><ShieldCheck size={18}/><div><b>{title}</b><div className="muted small">{subtitle}</div></div></div></div><div className="admin-nav">{nav.map(([id,label])=><button className={'btn '+(tab===id?'primary':'')} key={id} onClick={()=>setTab(id)}>{label}</button>)}</div>{allowed&&<>{tab==='overview'&&<AdminOverview onNavigate={setTab}/>}{tab==='people'&&<People/>}{tab==='giras'&&<GiraTurnManager p={p} editor={editor}/>}{tab==='finance'&&<AdminFinance/>}{tab==='invites'&&<Invites/>}{tab==='content'&&<Content/>}{tab==='questions'&&<AdminQuestions/>}</>}</div>}
function AdminOverview({onNavigate}){const[stats,setStats]=useState(null),[loading,setLoading]=useState(true),[message,setMessage]=useState('');
 const load=async()=>{setLoading(true);setMessage('');try{const now=new Date(),month=now.toISOString().slice(0,7),cutoff=new Date(now.getTime()-3*86400000);
 const [{data:people},{data:dues},{data:giras},{data:questions}]=await Promise.all([
  supabase.from('profiles').select('id,name,email,date_of_birth,orixa_symbol,group_id,is_active,role,leadership_seal,last_seen_at').eq('is_active',true).order('name'),
  supabase.from('monthly_dues').select('profile_id,status,reference_month').eq('reference_month',month+'-01'),
  supabase.from('giras').select('*').eq('status','published').gte('starts_at',now.toISOString()).order('starts_at').limit(1),
  supabase.rpc('admin_house_questions',{p_status:'open'})
 ]);
 const next=giras?.[0]||null;
 const attendance=next?(await supabase.rpc('editor_gira_attendance',{p_gira_id:next.id})).data||[]:[];
 const eligiblePeople=(people||[]).filter(x=>financialEligible(x.date_of_birth,now,x.is_pai_de_santo));
 const paid=new Set((dues||[]).filter(x=>x.status==='paid').map(x=>x.profile_id));
 const unpaid=Math.max(0,eligiblePeople.length-paid.size);
 const noResponse=(attendance||[]).filter(x=>x.status==='no_response').length;
 const inactive=(people||[]).filter(x=>!x.last_seen_at||new Date(x.last_seen_at)<cutoff).map(x=>{const seen=x.last_seen_at?new Date(x.last_seen_at):null;const days=seen?Math.floor((now-seen)/86400000):null;return{...x,days}});
 inactive.sort((a,b)=>(b.days??99999)-(a.days??99999));
 setStats({active:people?.length||0,unpaid,questions:(questions||[]).length,next,noResponse,inactive});
 }catch(e){setMessage(err(e))}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const go=tab=>onNavigate(tab);
 return <div className="admin-dashboard"><div className="row between"><div><span className="eyebrow">PAINEL DA CASA</span><h2>Visão</h2><p className="muted">Um resumo rápido do que precisa de atenção agora.</p></div><button className="btn" onClick={load}><RefreshCw size={14}/> Atualizar</button></div>
 {message&&<div className="toast">{message}</div>}
 {loading?<div className="card">Carregando o painel…</div>:stats&&<>
  <div className="usage-summary">
   <button className="card dashboard-kpi" onClick={()=>go('people')}><b>{stats.active}</b><span>Membros ativos</span></button>
   <button className="card dashboard-kpi" onClick={()=>go('finance')}><b>{stats.unpaid}</b><span>Mensalidades não pagas</span></button>
   <button className="card dashboard-kpi" onClick={()=>go('giras')}><b>{stats.noResponse}</b><span>Sem resposta na próxima gira</span></button>
   <button className="card dashboard-kpi" onClick={()=>go('questions')}><b>{stats.questions}</b><span>Mensagens pendentes</span></button>
  </div>
  <div className="dashboard-grid" style={{marginTop:16}}>
   <div className="card dashboard-panel"><div className="row between"><div><span className="eyebrow">PRÓXIMA GIRA</span><h3>{stats.next?stats.next.name:'Nenhuma gira próxima'}</h3></div>{stats.next&&<span className="pill">{stats.noResponse} sem resposta</span>}</div>{stats.next?<><p className="muted small">{dateTime(stats.next.starts_at)}</p><div className="dashboard-line"><span>Respostas pendentes</span><b>{stats.noResponse}</b></div><button className="btn" onClick={()=>go('giras')}>Acompanhar gira →</button></>:<p className="muted">Cadastre a próxima gira para acompanhar as respostas.</p>}</div>
   <div className="card dashboard-panel"><div className="row between"><div><span className="eyebrow">ACESSO AO APLICATIVO</span><h3>{stats.inactive.length} não entram há mais de 3 dias</h3></div><span className="pill">{stats.inactive.length}</span></div>{stats.inactive.length?<div className="dashboard-mini-list">{stats.inactive.slice(0,5).map(x=><div className="dashboard-mini-row" key={x.id}><div><b>{x.name||x.email}</b><small>{x.last_seen_at?('Último acesso há '+x.days+' dias'):'Nunca entrou'}</small></div></div>)}</div>:<p className="muted">Todos os membros ativos acessaram o aplicativo nos últimos 3 dias.</p>}{stats.inactive.length>5&&<p className="muted small">+ {stats.inactive.length-5} outras pessoas.</p>}<button className="btn" onClick={()=>go('people')}>Ver pessoas →</button></div>
  </div>
  <div className="dashboard-note"><span>Resumo da casa</span><b>{stats.unpaid===0&&stats.noResponse===0&&stats.questions===0&&stats.inactive.length===0?'Tudo em dia.':'Há itens que merecem atenção.'}</b></div>
 </>}</div>}function AdminQuestions(){const[items,setItems]=useState([]),[status,setStatus]=useState('open'),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[answers,setAnswers]=useState({});
 const load=async()=>{setLoading(true);const {data,error}=await supabase.rpc('admin_house_questions',{p_status:status});if(error)setMessage(err(error));setItems(data||[]);setLoading(false)};useEffect(()=>{load()},[status]);
 const answer=async id=>{const text=answers[id]||'';if(!text.trim())return;const {error}=await supabase.rpc('admin_answer_house_question',{p_id:id,p_answer:text});if(error)setMessage(err(error));else{setAnswers({...answers,[id]:''});load()}};
 const markRead=async id=>{await supabase.rpc('mark_house_question_read',{p_id:id});load()};
 return <div><div className="row between"><div><span className="eyebrow">CAIXA DA CASA</span><h2>Contato com os Pais</h2><p className="muted">Acompanhe, leia e responda as mensagens enviadas pela comunidade.</p></div><button className="btn" onClick={load}>Atualizar</button></div><div className="choice"><button className={'btn '+(status==='open'?'primary':'')} onClick={()=>setStatus('open')}>Em aberto</button><button className={'btn '+(status==='answered'?'primary':'')} onClick={()=>setStatus('answered')}>Respondidas</button><button className={'btn '+(status==='archived'?'primary':'')} onClick={()=>setStatus('archived')}>Arquivadas</button></div>{message&&<div className="toast">{message}</div>}{loading?<div className="card muted">Carregando…</div>:!items.length?<div className="card empty">Nenhuma mensagem nesta categoria.</div>:items.map(x=><div className="card" key={x.id}><div className="row between"><div><span className="pill">{x.is_anonymous?'ANÔNIMA':'IDENTIFICADA'}</span>{!x.is_anonymous&&x.sender_name&&<span className="muted small" style={{marginLeft:8}}>{x.sender_name}</span>}</div><span className="muted small">{new Date(x.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</span></div><p style={{whiteSpace:'pre-wrap',marginTop:12}}>{x.question}</p><div className="muted small">{x.read_at?'✓ Lida':'○ Não lida'} · {x.answer?'✓ Respondida':'○ Sem resposta'}</div>{!x.read_at&&<button className="btn" style={{marginTop:10}} onClick={()=>markRead(x.id)}>Marcar como lida</button>}{x.status==='open'&&<div style={{marginTop:14}}><Field label="Resposta"><textarea className="textarea" rows="4" value={answers[x.id]||''} onChange={e=>setAnswers({...answers,[x.id]:e.target.value})} placeholder="Escreva a resposta dos Pais da Casa…"/></Field><button className="btn primary" onClick={()=>answer(x.id)}>Enviar resposta</button></div>}{x.answer&&<div className="card" style={{marginTop:14,background:'#f1f5ed'}}><b>Resposta enviada</b><p style={{whiteSpace:'pre-wrap'}}>{x.answer}</p></div>}</div>)}</div>}

function AdminGiraTurnControl({gira,editor=false}){const[turns,setTurns]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[capacityDrafts,setCapacityDrafts]=useState({});
 const load=async()=>{const{data:t,error:te}=await supabase.from('gira_turns').select('*').eq('gira_id',gira.id).order('sort_order');if(te){setMessage(err(te));return}const ids=(t||[]).map(x=>x.id);const[{data:a,error:ae},{data:p,error:pe}]=ids.length?await Promise.all([supabase.from('gira_turn_availability').select('gira_turn_id,profile_id').in('gira_turn_id',ids),supabase.from('profiles').select('id,name').eq('is_active',true).order('name')]):[{data:[],error:null},{data:[],error:null}];if(ae||pe){setMessage(err(ae||pe));return}const names=Object.fromEntries((p||[]).map(x=>[x.id,x.name]));const rows=(t||[]).map(turn=>({...turn,people:(a||[]).filter(x=>x.gira_turn_id===turn.id).map(x=>({id:x.profile_id,name:names[x.profile_id]||'Pessoa'})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))}));setTurns(rows);setCapacityDrafts(Object.fromEntries(rows.map(x=>[x.id,String(x.capacity||'')])))}; 
 useEffect(()=>{load()},[gira.id]);
 const saveCapacity=async turn=>{const value=Number(capacityDrafts[turn.id]);if(!Number.isInteger(value)||value<1){setMessage('A capacidade deve ser de pelo menos 1 pessoa.');return}if(value<turn.people.length){setMessage('A capacidade não pode ser menor que as pessoas já alocadas.');return}setBusy(true);const{error}=await supabase.rpc('admin_set_gira_turn_capacity',{p_gira_turn_id:turn.id,p_capacity:value});setMessage(error?err(error):'Capacidade de '+turn.label+' atualizada.');setBusy(false);if(!error)load()};
 const reopen=async()=>{if(busy)return;if(!window.confirm('Reabrir a escolha de turnos por 72 horas e avisar todas as pessoas que confirmaram esta gira?'))return;setBusy(true);setMessage('');const{data,error}=await supabase.rpc('admin_reopen_gira_turn_availability',{p_gira_id:gira.id,p_hours:72});setMessage(error?err(error):`Disponibilidade reaberta por 72 horas. ${data||0} pessoa(s) avisada(s).`);setBusy(false);if(!error)load()};
 const move=async(person,from,to)=>{if(!to||busy)return;const target=turns.find(x=>x.id===to);if(target&&target.capacity>0&&target.people.length>=target.capacity){setMessage('Esse turno está completo.');return}setBusy(true);setMessage('');const{error}=await supabase.rpc('admin_move_gira_participant',{p_gira_id:gira.id,p_profile_id:person.id,p_from_turn_id:from,p_to_turn_id:to});setMessage(error?err(error):person.name+' foi movido para '+(target?.label||'o novo turno')+'. A pessoa receberá uma notificação.');setBusy(false);if(!error)load()};
 return <div className="card gira-admin-turn-control"><div className="row between"><div><span className="eyebrow">DIVISÃO DOS TURNOS</span><h3>Organizar quem fica em cada turno</h3><p className="muted small">Defina a capacidade de cada turno e, depois, mova pessoas quando os Pais de Santo pedirem uma alteração.</p></div><button className="btn primary" disabled={busy} onClick={reopen}>Reabrir escolha e avisar confirmados</button></div>{message&&<div className="toast">{message}</div>}<div className="gira-admin-turn-grid">{turns.map(turn=><div className="gira-admin-turn-card" key={turn.id}><div className="row between"><div><b>{turn.label}</b><span className="muted small">{turn.shift_date?new Date(turn.shift_date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'}):''}</span></div><span className="pill">{turn.people.length}/{turn.capacity||'—'}</span></div><div className="gira-admin-turn-capacity"><label className="muted small">Capacidade</label><div className="row"><input className="input" type="number" min="1" value={capacityDrafts[turn.id]||''} onChange={e=>setCapacityDrafts(v=>({...v,[turn.id]:e.target.value}))}/><button className="btn" disabled={busy} onClick={()=>saveCapacity(turn)}>Salvar</button></div></div>{turn.people.length?<div className="gira-admin-turn-people">{turn.people.map(person=><div className="gira-admin-turn-person" key={person.id}><div><b>{person.name}</b></div><div className="gira-admin-turn-move"><select className="select" value="" disabled={busy} onChange={e=>{const to=e.target.value;if(to){const target=turns.find(x=>x.id===to);if(target&&target.capacity>0&&target.people.length>=target.capacity){setMessage('Esse turno está completo.');return}if(window.confirm('Mover '+person.name+' de '+turn.label+' para '+target.label+'?'))move(person,turn.id,to)}}}><option value="">Mover para…</option>{turns.filter(x=>x.id!==turn.id).map(x=><option value={x.id} key={x.id} disabled={x.capacity>0&&x.people.length>=x.capacity}>{x.label}{x.capacity>0?' · '+x.people.length+'/'+x.capacity:''}</option>)}</select></div></div>)}</div>:<p className="muted small">Ninguém alocado neste turno.</p>}</div>)}</div></div>}
// ===================================================================
// GESTÃO DA CASA > GIRAS — fluxo único (lista + wizard de 5 etapas)
// Etapas: 1 Informações · 2 Turnos · 3 Atividades (só com turnos) · 4 Prévia · 5 Publicação
// Fonte única de verdade: tabela `giras` (status draft/published) + gira_turns + tasks + gira_task_subtasks.
// ===================================================================
const GIRA_STATUS={draft:'Rascunho',published:'Publicada'};
const newId=()=>{try{if(window.crypto?.randomUUID)return window.crypto.randomUUID()}catch(e){}return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16)})};
const pad2=n=>String(n).padStart(2,'0');
const localDateOf=iso=>{if(!iso)return '';const d=new Date(iso);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())};
const localTimeOf=iso=>{if(!iso)return '';const d=new Date(iso);return pad2(d.getHours())+':'+pad2(d.getMinutes())};
const shiftLabel=s=>{if(!s?.date||!s?.time)return 'Turno sem dia/horário';const[y,m,d]=s.date.split('-');const[h,mi]=s.time.split(':');return d+'/'+m+' · '+Number(h)+'h'+(mi&&mi!=='00'?mi:'')};
const wizardProgress={read:id=>{try{return JSON.parse(localStorage.getItem('gira-wizard:'+id)||'{}')}catch(e){return {}}},write:(id,v)=>{try{localStorage.setItem('gira-wizard:'+id,JSON.stringify(v))}catch(e){}},clear:id=>{try{localStorage.removeItem('gira-wizard:'+id)}catch(e){}}};
const emptyGiraInfo=()=>({name:'',date:'',time:'',activity_type:'gira',entity_lines:[],hasContribution:false,contribution_amount:'',contribution_due_date:'',what_to_bring:'',notes:'',coverMode:'color',cover_color:'#65745A',art_path:'',coverFile:null});
const validateGiraInfo=g=>{const e={};if(!g.name.trim())e.name='Informe o nome da gira.';if(!g.date)e.date='Informe o dia.';if(!g.time)e.time='Informe o horário.';if(!types[g.activity_type])e.activity_type='Escolha o tipo de gira.';if(g.hasContribution&&!(Number(g.contribution_amount)>0))e.contribution_amount='Informe um valor maior que zero.';return e};
const validateGiraShifts=(hasShifts,shifts)=>{const e={};if(hasShifts===null||hasShifts===undefined){e.hasShifts='Responda se a gira possui turnos de atividades.';return e}if(!hasShifts)return e;if(!shifts.length)e.list='Cadastre pelo menos um turno.';const seen={};shifts.forEach(s=>{if(!s.date||!s.time){e[s.id]='Preencha o dia e o horário.';return}const k=s.date+' '+s.time;if(seen[k])e[s.id]='Já existe um turno neste dia e horário.';seen[k]=true});return e};
const validateGiraTasks=(tasks,shifts)=>{const e={};const ids=new Set(shifts.map(s=>s.id));tasks.forEach(t=>{if(!t.name.trim())e[t.id+':name']='Informe o nome da tarefa.';if(!t.shiftId||!ids.has(t.shiftId))e[t.id+':shift']='Escolha um turno cadastrado.';t.subtasks.forEach(s=>{if(!s.name.trim())e[s.id]='Preencha ou remova esta subtarefa.'})});return e};
const giraInfoPayload=g=>({name:g.name.trim(),starts_at:new Date(g.date+'T'+g.time+':00').toISOString(),activity_type:g.activity_type,entity_lines:g.entity_lines,has_contribution:g.hasContribution,contribution_amount:g.hasContribution?Number(g.contribution_amount):0,contribution_due_date:g.hasContribution&&g.contribution_due_date?g.contribution_due_date:null,what_to_bring:g.what_to_bring,notes:g.notes,art_path:g.coverMode==='image'?g.art_path:'',cover_color:g.coverMode==='color'?g.cover_color:''});
const FieldError=({msg})=>msg?<p className="gw-field-error" role="alert">{msg}</p>:null;

async function loadGiraStructure(giraId){
 const[{data:turns,error:te},{data:tasks,error:ke}]=await Promise.all([
  supabase.from('gira_turns').select('id,shift_date,starts_at,label,sort_order,enabled,capacity').eq('gira_id',giraId).eq('enabled',true).order('sort_order'),
  supabase.from('tasks').select('id,name,gira_turn_id,sort_order').eq('gira_id',giraId).order('sort_order')
 ]);
 if(te||ke)throw(te||ke);
 const taskIds=(tasks||[]).map(t=>t.id);
 const{data:subs,error:se}=taskIds.length?await supabase.from('gira_task_subtasks').select('id,task_id,title,sort_order').in('task_id',taskIds).order('sort_order'):{data:[],error:null};
 if(se)throw se;
 const shifts=(turns||[]).map(t=>({id:t.id,date:t.shift_date||'',time:String(t.starts_at||'').slice(0,5),label:t.label,capacity:t.capacity}));
 const list=(tasks||[]).map(t=>({id:t.id,name:t.name||'',shiftId:t.gira_turn_id||'',subtasks:(subs||[]).filter(s=>s.task_id===t.id).map(s=>({id:s.id,name:s.title||''}))}));
 return {shifts,tasks:list};
}

function GiraTurnManager({p,editor=false}){
 const[giras,setGiras]=useState([]),[loading,setLoading]=useState(true),[view,setView]=useState('list'),[selectedId,setSelectedId]=useState(''),[message,setMessage]=useState(''),[busyId,setBusyId]=useState(''),[wizardKey,setWizardKey]=useState(0);
 const lock=React.useRef(false);
 const load=async()=>{setLoading(true);const{data,error}=await supabase.from('giras').select('*').order('starts_at',{ascending:false});if(error)setMessage(err(error));setGiras(data||[]);setLoading(false)};
 useEffect(()=>{load()},[]);
 const selected=giras.find(x=>x.id===selectedId);
 const openWizard=id=>{setMessage('');setSelectedId(id||'');setWizardKey(k=>k+1);setView('wizard');window.scrollTo({top:0,behavior:'smooth'})};
 const openDetail=g=>{setMessage('');setSelectedId(g.id);setView('detail');window.scrollTo({top:0,behavior:'smooth'})};
 const backToList=msg=>{setMessage(msg||'');setView('list');setSelectedId('');load()};
 const duplicate=async g=>{if(lock.current)return;lock.current=true;setBusyId(g.id);setMessage('');const{data,error}=await supabase.rpc('duplicate_gira',{p_gira_id:g.id});lock.current=false;setBusyId('');if(error){setMessage('Não foi possível duplicar: '+err(error));return}await load();openWizard(data);setMessage('Cópia criada como rascunho. Ajuste o que for necessário e publique quando estiver pronta.')};
 const remove=async g=>{if(!confirm(g.status==='draft'?'Excluir este rascunho? Esta ação não pode ser desfeita.':'Excluir esta gira publicada? Presenças, turnos e tarefas dela também deixarão de existir.'))return;const{error}=await supabase.rpc('delete_gira',{p_gira_id:g.id});if(error)setMessage(err(error));else backToList('Gira excluída.')};
 const drafts=giras.filter(g=>g.status==='draft'),published=giras.filter(g=>g.status!=='draft');
 const card=g=><div className={'gw-list-item '+(g.status==='draft'?'is-draft':'')} key={g.id}><UnifiedGiraCard g={g} mode="admin" onOpen={openDetail}/><div className="gw-list-actions"><span className={'gw-status gw-status-'+(g.status==='draft'?'draft':'published')}>{GIRA_STATUS[g.status]||'Publicada'}</span><div className="gw-list-buttons"><button className="btn" onClick={()=>openDetail(g)}>Ver</button><button className="btn" onClick={()=>openWizard(g.id)}><Pencil size={14}/> {g.status==='draft'?'Continuar edição':'Editar'}</button><button className="btn" disabled={!!busyId} onClick={()=>duplicate(g)}>{busyId===g.id?'Duplicando…':'Duplicar'}</button></div></div></div>;
 if(view==='wizard')return <GiraWizard key={wizardKey} p={p} giraId={selectedId} initialMessage={message} onCreated={id=>setSelectedId(id)} onExit={backToList}/>;
 return <div className="gira-admin-page">
  {message&&<div className="toast">{message}</div>}
  {view==='list'&&<>
   <div className="row between gira-admin-header"><div><span className="eyebrow">AGENDA DA CASA</span><h2>Giras</h2><p className="muted">Crie, revise e publique as giras da casa. Rascunhos só aparecem aqui.</p></div><button className="btn primary" onClick={()=>openWizard('')}><Plus size={14}/> Criar nova gira</button></div>
   {loading?<div className="card muted">Carregando giras…</div>:!giras.length?<div className="card empty"><h3>Nenhuma gira cadastrada</h3><p className="muted">Quando você criar uma gira, ela aparecerá aqui.</p><button className="btn primary" onClick={()=>openWizard('')}>Criar primeira gira</button></div>:<>
    {drafts.length>0&&<section className="gw-list-section"><div className="gw-list-heading"><span className="eyebrow">EM PREPARAÇÃO</span><h3>Rascunhos <span className="gw-count">{drafts.length}</span></h3><p className="muted small">Visíveis apenas para a gestão. Continue de onde parou e publique quando estiver pronto.</p></div><div className="gira-admin-list">{drafts.map(card)}</div></section>}
    <section className="gw-list-section"><div className="gw-list-heading"><span className="eyebrow">NA AGENDA DOS MEMBROS</span><h3>Publicadas <span className="gw-count">{published.length}</span></h3></div>{published.length?<div className="gira-admin-list">{published.map(card)}</div>:<p className="muted">Nenhuma gira publicada ainda.</p>}</section>
   </>}
  </>}
  {view==='detail'&&selected&&<GiraAdminDetail g={selected} editor={editor} onBack={()=>backToList('')} onEdit={()=>openWizard(selected.id)} onDuplicate={()=>duplicate(selected)} duplicating={busyId===selected.id} onRemove={()=>remove(selected)}/>}
 </div>
}

function GiraAdminDetail({g,editor,onBack,onEdit,onDuplicate,duplicating,onRemove}){
 const[structure,setStructure]=useState(null),[message,setMessage]=useState('');
 useEffect(()=>{loadGiraStructure(g.id).then(setStructure).catch(e=>setMessage(err(e)))},[g.id]);
 const shiftOf=id=>structure?.shifts.find(s=>s.id===id);
 return <div className="gira-admin-detail">
  <button className="btn gira-admin-back" onClick={onBack}><ArrowLeft size={14}/> Voltar para giras</button>
  <div className="card gira-admin-detail-hero" style={g.art_path?{backgroundImage:'linear-gradient(90deg,rgba(0,0,0,.45),rgba(0,0,0,.05)),url('+g.art_path+')',color:'#fff'}:{borderTop:'8px solid '+(g.cover_color||'#E8E0D0')}}><div><span className={'gw-status gw-status-'+(g.status==='draft'?'draft':'published')}>{GIRA_STATUS[g.status]||'Publicada'}</span> <span className="activity-tag">{typeLabel(g.activity_type)}</span><h2>{g.name}</h2><p className="gira-admin-detail-date">{new Date(g.starts_at).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})} · {new Date(g.starts_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p>{g.entity_lines?.length>0&&<div className="entity-chips">{g.entity_lines.map(id=>{const x=lineInfo(id);return x?<span className="entity-chip" key={id}>{x[1]} {x[2]}</span>:null})}</div>}</div><div className="choice"><button className="btn" onClick={onEdit}><Pencil size={14}/> {g.status==='draft'?'Continuar edição':'Editar gira'}</button><button className="btn" disabled={duplicating} onClick={onDuplicate}>{duplicating?'Duplicando…':'Duplicar'}</button>{!editor&&<button className="btn danger" onClick={onRemove}><Trash2 size={14}/> Excluir</button>}</div></div>
  {message&&<div className="toast">{message}</div>}
  <div className="grid gira-admin-detail-grid"><div className="card"><span className="eyebrow">CONTRIBUIÇÃO</span><p>{Number(g.contribution_amount)>0?money(g.contribution_amount)+(g.contribution_due_date?' · vence '+new Date(g.contribution_due_date+'T12:00:00').toLocaleDateString('pt-BR'):''):'Sem contribuição'}</p></div><div className="card"><span className="eyebrow">TURNOS DE ATIVIDADES</span><p>{g.has_activity_shifts?(structure?structure.shifts.length+' turno(s) · '+structure.tasks.length+' tarefa(s)':'Carregando…'):'Esta gira não possui turnos de atividades.'}</p></div></div>
  {(g.what_to_bring||g.notes)&&<div className="grid gira-admin-detail-grid"><div className="card"><span className="eyebrow">O QUE LEVAR</span><p className="gira-admin-preserve">{g.what_to_bring||'—'}</p></div><div className="card"><span className="eyebrow">OBSERVAÇÕES</span><p className="gira-admin-preserve">{g.notes||'—'}</p></div></div>}
  {g.has_activity_shifts&&structure&&<div className="card"><span className="eyebrow">ATIVIDADES POR TURNO</span>{structure.shifts.map(s=>{const list=structure.tasks.filter(t=>t.shiftId===s.id);return <div className="gw-detail-shift" key={s.id}><b>{s.label||shiftLabel(s)}</b>{list.length?<ul>{list.map(t=><li key={t.id}>{t.name}{t.subtasks.length>0&&<ul>{t.subtasks.map(x=><li key={x.id}>{x.name}</li>)}</ul>}</li>)}</ul>:<p className="muted small">Nenhuma tarefa neste turno.</p>}</div>})}</div>}
  {g.has_activity_shifts&&g.status!=='draft'&&<AdminGiraTurnControl gira={g} editor={editor}/>}
 </div>
}

function GiraWizard({p,giraId,initialMessage='',onCreated,onExit}){
 const[id,setId]=useState(giraId||''),[status,setStatus]=useState('draft'),[loaded,setLoaded]=useState(!giraId),[g,setG]=useState(emptyGiraInfo()),[hasShifts,setHasShifts]=useState(null),[shifts,setShifts]=useState([]),[tasks,setTasks]=useState([]),[step,setStep]=useState('info'),[errors,setErrors]=useState({}),[message,setMessage]=useState(initialMessage),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[savedAt,setSavedAt]=useState(null),[coverLibrary,setCoverLibrary]=useState([]),[previewKey,setPreviewKey]=useState(0),[previewPhase,setPreviewPhase]=useState('choose'),[publishState,setPublishState]=useState({busy:false,done:false,error:'',chargeError:''}),[notifyState,setNotifyState]=useState({busy:false,done:false,count:0,error:''});
 const initialId=React.useRef(giraId).current;const savingRef=React.useRef(false),publishRef=React.useRef(false),notifyRef=React.useRef(false);
 const steps=[['info','Informações'],['shifts','Turnos'],...(hasShifts===false?[]:[['activities','Atividades']]),['preview','Prévia'],['publish','Publicação']];
 const stepIndex=steps.findIndex(s=>s[0]===step);
 const touch=()=>{setDirty(true);setErrors(e=>Object.keys(e).length?{}:e)};
 const setInfo=patch=>{setG(v=>({...v,...patch}));touch()};
 useEffect(()=>{supabase.storage.from('gira-art').list('Capas',{limit:100,sortBy:{column:'name',order:'asc'}}).then(({data})=>setCoverLibrary((data||[]).filter(x=>x.name&&x.name!=='placeholder').map(x=>({name:x.name,url:supabase.storage.from('gira-art').getPublicUrl('Capas/'+x.name).data.publicUrl}))))},[]);
 useEffect(()=>{if(!initialId)return;(async()=>{try{const{data:row,error}=await supabase.from('giras').select('*').eq('id',initialId).single();if(error)throw error;const structure=await loadGiraStructure(initialId);const progress=wizardProgress.read(initialId);
   setStatus(row.status||'published');
   setG({name:row.name||'',date:localDateOf(row.starts_at),time:localTimeOf(row.starts_at),activity_type:row.activity_type||'gira',entity_lines:Array.isArray(row.entity_lines)?row.entity_lines:[],hasContribution:Number(row.contribution_amount||0)>0,contribution_amount:Number(row.contribution_amount||0)>0?String(row.contribution_amount):'',contribution_due_date:row.contribution_due_date||'',what_to_bring:row.what_to_bring||'',notes:row.notes||'',coverMode:row.art_path?'image':'color',cover_color:row.cover_color||'#65745A',art_path:row.art_path||'',coverFile:null});
   setShifts(structure.shifts);setTasks(structure.tasks);
   setHasShifts(row.has_activity_shifts?true:(row.status==='draft'&&!progress.shiftsAnswered&&!structure.shifts.length?null:false));
   const resumeAt=progress.step&&row.status==='draft'?progress.step:'info';setStep(resumeAt==='activities'&&!row.has_activity_shifts?'shifts':resumeAt);
   setLoaded(true);if(progress.step&&row.status==='draft'&&!initialMessage)setMessage('Rascunho recuperado. Você está continuando de onde parou.');
  }catch(e){setMessage('Não foi possível carregar a gira: '+err(e));setLoaded(true)}})()},[]);
 useEffect(()=>{const h=e=>{if(dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',h);return()=>window.removeEventListener('beforeunload',h)},[dirty]);
 useEffect(()=>{if(id&&loaded)wizardProgress.write(id,{step,shiftsAnswered:hasShifts!==null})},[id,step,hasShifts,loaded]);

 const uploadCover=async(gid,file)=>{const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=gid+'/'+Date.now()+'.'+ext;const{error}=await supabase.storage.from('gira-art').upload(path,file,{upsert:true,contentType:file.type||undefined});if(error)throw error;return supabase.storage.from('gira-art').getPublicUrl(path).data.publicUrl};
 const saveInfo=async()=>{const e=validateGiraInfo(g);setErrors(e);if(Object.keys(e).length)return false;
  let gid=id;const{data,error}=await supabase.rpc('editor_save_gira_info',{p_gira_id:gid||null,p_info:giraInfoPayload(g)});if(error)throw error;
  if(!gid){gid=data;setId(gid);onCreated&&onCreated(gid)}
  if(g.coverMode==='image'&&g.coverFile){const url=await uploadCover(gid,g.coverFile);const next={...g,art_path:url,coverFile:null};setG(next);const{error:e2}=await supabase.rpc('editor_save_gira_info',{p_gira_id:gid,p_info:giraInfoPayload(next)});if(e2)throw e2}
  if(status==='published'&&g.hasContribution&&Number(g.contribution_amount)>0){const{error:ce}=await supabase.rpc('sync_gira_contribution_charge',{p_gira_id:gid});if(ce)setMessage('Informações salvas, mas as cobranças da contribuição não foram atualizadas: '+err(ce))}
  return true};
 const saveStructure=async()=>{const e={...validateGiraShifts(hasShifts,shifts),...(hasShifts?validateGiraTasks(tasks,shifts):{})};setErrors(e);if(Object.keys(e).length)return false;
  const payloadShifts=hasShifts?shifts.map(s=>({id:s.id,date:s.date,time:s.time})):[];
  const payloadTasks=hasShifts?tasks.map(t=>({id:t.id,name:t.name.trim(),shiftId:t.shiftId,subtasks:t.subtasks.filter(s=>s.name.trim()).map(s=>({id:s.id,name:s.name.trim()}))})):[];
  const{error}=await supabase.rpc('editor_save_gira_structure',{p_gira_id:id,p_has_shifts:!!hasShifts,p_turns:payloadShifts,p_tasks:payloadTasks});if(error)throw error;
  if(!hasShifts){setShifts([]);setTasks([])}
  return true};
 // Salva a etapa atual. Retorna true quando está tudo persistido.
 const saveCurrent=async(target=step)=>{if(savingRef.current)return false;if(target!=='info'&&!id){setErrors({});setMessage('Preencha e salve as informações da gira primeiro.');return false}
  if(!dirty&&target!=='info'&&target!=='shifts'&&target!=='activities')return true;
  if(!dirty&&id&&target==='info')return true;
  savingRef.current=true;setSaving(true);setMessage('');
  try{const ok=target==='info'?await saveInfo():await saveStructure();if(ok){setDirty(false);setSavedAt(new Date())}else setMessage('Revise os campos destacados antes de continuar.');return ok}
  catch(e){setMessage('Não foi possível salvar: '+err(e)+' Seus dados continuam na tela; tente novamente.');return false}
  finally{savingRef.current=false;setSaving(false)}};
 const canReach=target=>{const order=steps.map(s=>s[0]);const ti=order.indexOf(target);if(ti<=0)return true;if(!id)return false;if(ti>order.indexOf('shifts')&&hasShifts===null)return false;return true};
 const goTo=async target=>{if(target===step)return;if(!canReach(target)&&!(steps.findIndex(s=>s[0]===target)===stepIndex+1)){setMessage('Conclua as etapas anteriores primeiro.');return}
  const ok=await saveCurrent(step);if(!ok)return;
  if((target==='preview'||target==='publish')&&hasShifts&&step!=='activities'){const e=validateGiraTasks(tasks,shifts);if(Object.keys(e).length){setErrors(e);setStep('activities');setMessage('Revise as atividades antes de seguir.');return}}
  if(target==='preview'){setPreviewKey(k=>k+1);setPreviewPhase('choose')}
  setErrors({});setStep(target);window.scrollTo({top:0,behavior:'smooth'})};
 const next=()=>{const n=steps[stepIndex+1];if(n)goTo(n[0])};
 const prev=()=>{const n=steps[stepIndex-1];if(n)goTo(n[0])};
 const exit=async()=>{if(dirty&&!confirm('Há alterações não salvas nesta etapa. Sair mesmo assim?'))return;onExit(id&&status==='draft'?'Rascunho salvo. Você pode continuar depois.':'')};

 // ---- Turnos ----
 const chooseShifts=v=>{if(v===hasShifts)return;if(v===false&&(shifts.length||tasks.length)&&!confirm('Ao salvar, os '+shifts.length+' turno(s) e '+tasks.length+' tarefa(s) desta gira serão removidos. Deseja continuar?'))return;setHasShifts(v);if(v&&!shifts.length)setShifts([{id:newId(),date:g.date||'',time:''}]);touch()};
 const addShift=()=>{setShifts(v=>[...v,{id:newId(),date:v[v.length-1]?.date||g.date||'',time:''}]);touch()};
 const updateShift=(sid,patch)=>{setShifts(v=>v.map(s=>s.id===sid?{...s,...patch}:s));touch()};
 const removeShift=s=>{const used=tasks.filter(t=>t.shiftId===s.id);if(used.length){setErrors(v=>({...v,[s.id]:'Este turno está ligado a '+used.length+' tarefa(s): '+used.map(t=>t.name||'sem nome').join(', ')+'. Mude o turno dessas tarefas antes de excluir.'}));return}if(!confirm('Excluir o turno '+shiftLabel(s)+'?'))return;setShifts(v=>v.filter(x=>x.id!==s.id));touch()};
 // ---- Atividades ----
 const addTask=()=>{setTasks(v=>[...v,{id:newId(),name:'',shiftId:shifts.length===1?shifts[0].id:'',subtasks:[]}]);touch()};
 const updateTask=(tid,patch)=>{setTasks(v=>v.map(t=>t.id===tid?{...t,...patch}:t));touch()};
 const removeTask=t=>{if(!confirm('Excluir a tarefa "'+(t.name||'sem nome')+'" e suas '+t.subtasks.length+' subtarefa(s)?'))return;setTasks(v=>v.filter(x=>x.id!==t.id));touch()};
 const addSubtask=tid=>{setTasks(v=>v.map(t=>t.id===tid?{...t,subtasks:[...t.subtasks,{id:newId(),name:''}]}:t));touch()};
 const updateSubtask=(tid,sid,name)=>{setTasks(v=>v.map(t=>t.id===tid?{...t,subtasks:t.subtasks.map(s=>s.id===sid?{...s,name}:s)}:t));touch()};
 const removeSubtask=(tid,sid)=>{setTasks(v=>v.map(t=>t.id===tid?{...t,subtasks:t.subtasks.filter(s=>s.id!==sid)}:t));touch()};

 // ---- Publicação ----
 const publish=async()=>{if(publishRef.current)return;publishRef.current=true;setPublishState({busy:true,done:false,error:'',chargeError:''});
  const ok=await saveCurrent(step);if(!ok){publishRef.current=false;setPublishState({busy:false,done:false,error:'',chargeError:''});return}
  const{error}=await supabase.rpc('publish_gira',{p_gira_id:id});
  if(error){publishRef.current=false;setPublishState({busy:false,done:false,error:err(error),chargeError:''});return}
  setStatus('published');wizardProgress.clear(id);let chargeError='';
  if(g.hasContribution&&Number(g.contribution_amount)>0){const{error:ce}=await supabase.rpc('sync_gira_contribution_charge',{p_gira_id:id});if(ce)chargeError=err(ce)}
  publishRef.current=false;setPublishState({busy:false,done:true,error:'',chargeError})};
 const retryCharges=async()=>{const{error}=await supabase.rpc('sync_gira_contribution_charge',{p_gira_id:id});setPublishState(v=>({...v,chargeError:error?err(error):''}));if(!error)setMessage('Cobranças da contribuição geradas.')};
 const notify=async()=>{if(notifyRef.current||notifyState.done)return;notifyRef.current=true;setNotifyState({busy:true,done:false,count:0,error:''});const{data,error}=await supabase.rpc('notify_gira_published',{p_gira_id:id});notifyRef.current=false;setNotifyState(error?{busy:false,done:false,count:0,error:err(error)}:{busy:false,done:true,count:data||0,error:''})};

 if(!loaded)return <div className="card muted">Carregando gira…</div>;
 const selectedEntities=entityLines.filter(x=>g.entity_lines.includes(x[0]));
 const previewGira={id:id||'preview',name:g.name||'Nome da gira',starts_at:g.date&&g.time?new Date(g.date+'T'+g.time+':00').toISOString():new Date().toISOString(),activity_type:g.activity_type,entity_lines:g.entity_lines,art_path:g.coverMode==='image'?(g.coverFile?URL.createObjectURL(g.coverFile):g.art_path):'',cover_color:g.coverMode==='color'?g.cover_color:null,contribution_amount:g.hasContribution?Number(g.contribution_amount)||0:0,contribution_due_date:g.hasContribution?g.contribution_due_date:null,what_to_bring:g.what_to_bring,notes:g.notes,use_task_list:!!hasShifts,has_activity_shifts:!!hasShifts,status};
 const previewData={phase:previewPhase,turns:(hasShifts?shifts:[]).map(s=>({turn_id:s.id,label:shiftLabel(s),shift_date:s.date,capacity:s.capacity||7})),tasks:(hasShifts?tasks:[]).map(t=>({id:t.id,name:t.name,gira_turn_id:t.shiftId,subtasks:t.subtasks.filter(x=>x.name.trim())}))};

 if(publishState.done)return <div className="gw-success card">
  <div className="gw-success-mark"><Check size={30}/></div>
  <span className="eyebrow">PUBLICAÇÃO CONCLUÍDA</span><h2>Gira publicada com sucesso</h2>
  <p className="muted"><b>{g.name}</b> já está na agenda dos membros.</p>
  {publishState.chargeError&&<div className="gw-warning" role="alert"><b>A gira continua publicada,</b> mas as cobranças da contribuição não foram geradas: {publishState.chargeError} <button className="btn" onClick={retryCharges}>Tentar gerar novamente</button></div>}
  <div className="gw-notify card"><div><b>Avisar a comunidade</b><p className="muted small">Envia um aviso para todos os membros ativos, que aparece na tela inicial e na página da gira. É opcional e não altera a publicação.</p></div>
   {notifyState.done?<span className="gw-notify-done"><Check size={15}/> {notifyState.count} pessoa(s) notificada(s)</span>:<button className="btn primary" disabled={notifyState.busy} onClick={notify}>{notifyState.busy?'Enviando…':'Notificar usuários'}</button>}
   {notifyState.error&&<p className="gw-field-error" role="alert">Não foi possível enviar as notificações: {notifyState.error}. A gira continua publicada; tente novamente.</p>}
  </div>
  <div className="gw-actions"><button className="btn" onClick={()=>onExit('Gira publicada.')}><ArrowLeft size={14}/> Voltar para giras</button></div>
 </div>;

 return <div className="gw">
  <div className="gw-top"><button className="btn gira-admin-back" onClick={exit}><ArrowLeft size={14}/> Voltar para giras</button><div className="gw-save-state" aria-live="polite">{saving?<span>Salvando…</span>:dirty?<span className="gw-unsaved">Alterações não salvas</span>:savedAt?<span>✓ Salvo às {savedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>:id?<span>✓ Tudo salvo</span>:null}</div></div>
  <div className="gw-head"><span className={'gw-status gw-status-'+(status==='draft'?'draft':'published')}>{status==='draft'?(id?'Rascunho':'Novo rascunho'):'Publicada'}</span><h2>{id?(g.name||'Gira sem nome'):'Criar nova gira'}</h2>{status==='published'&&<p className="gw-live-note">Esta gira já está publicada: as alterações salvas aparecem para os membros.</p>}</div>
  <nav className="gw-stepper" aria-label="Etapas da gira">{steps.map(([k,l],i)=><button key={k} type="button" className={'gw-step '+(k===step?'is-current ':'')+(i<stepIndex?'is-done ':'')} aria-current={k===step?'step':undefined} disabled={saving||(!canReach(k)&&i!==stepIndex+1)} onClick={()=>goTo(k)}><span className="gw-step-num">{i<stepIndex?<Check size={13}/>:i+1}</span><span className="gw-step-label">{l}</span></button>)}</nav>
  {message&&<div className={/^(Revise|Não foi|Conclua|Preencha|Informações salvas, mas)/.test(message)?'gw-warning':'toast'} role="status">{message}</div>}

  {step==='info'&&<div className="card gw-panel">
   <div className="gw-panel-head"><h3>Informações da gira</h3><p className="muted small">O essencial para a comunidade saber do que se trata.</p></div>
   <div className="field"><label htmlFor="gw-name">Nome</label><input id="gw-name" className={'input '+(errors.name?'has-error':'')} value={g.name} onChange={e=>setInfo({name:e.target.value})} placeholder="Ex.: Gira de Caboclos"/><FieldError msg={errors.name}/></div>
   <div className="grid"><div className="field"><label htmlFor="gw-date">Dia</label><input id="gw-date" className={'input '+(errors.date?'has-error':'')} type="date" value={g.date} onChange={e=>setInfo({date:e.target.value})}/><FieldError msg={errors.date}/></div><div className="field"><label htmlFor="gw-time">Horário</label><input id="gw-time" className={'input '+(errors.time?'has-error':'')} type="time" value={g.time} onChange={e=>setInfo({time:e.target.value})}/><FieldError msg={errors.time}/></div></div>
   <div className="field"><label htmlFor="gw-type">Tipo de gira</label><select id="gw-type" className="select" value={g.activity_type} onChange={e=>setInfo({activity_type:e.target.value})}>{Object.entries(types).map(([k,v])=><option value={k} key={k}>{typeIcons[k]} {v}</option>)}</select><FieldError msg={errors.activity_type}/></div>
   <div className="field"><label>Entidades</label><div className="gira-entity-picker">{entityLines.map(x=><label className={'gira-entity-option '+(g.entity_lines.includes(x[0])?'selected':'')} key={x[0]}><input type="checkbox" checked={g.entity_lines.includes(x[0])} onChange={e=>setInfo({entity_lines:e.target.checked?[...g.entity_lines,x[0]]:g.entity_lines.filter(v=>v!==x[0])})}/><span>{x[1]}</span><b>{x[2]}</b></label>)}</div>{selectedEntities.length>0&&<div className="entity-chips" style={{marginTop:10}}>{selectedEntities.map(x=><span className="entity-chip" key={x[0]}>{x[1]} {x[2]}</span>)}</div>}</div>
   <div className="field"><label>Possui contribuição?</label><div className="gira-admin-choice-grid" role="radiogroup"><button type="button" role="radio" aria-checked={!g.hasContribution} className={'gira-admin-choice '+(!g.hasContribution?'selected':'')} onClick={()=>setInfo({hasContribution:false})}><span className="gira-admin-choice-icon">○</span><span><b>Não</b><small>Sem contribuição.</small></span></button><button type="button" role="radio" aria-checked={g.hasContribution} className={'gira-admin-choice '+(g.hasContribution?'selected':'')} onClick={()=>setInfo({hasContribution:true})}><span className="gira-admin-choice-icon">✓</span><span><b>Sim</b><small>Definir o valor.</small></span></button></div>
    {g.hasContribution&&<div className="grid" style={{marginTop:12}}><div className="field"><label htmlFor="gw-amount">Valor da contribuição (R$)</label><input id="gw-amount" className={'input '+(errors.contribution_amount?'has-error':'')} type="number" min="0" step="0.01" inputMode="decimal" value={g.contribution_amount} onChange={e=>setInfo({contribution_amount:e.target.value})} placeholder="0,00"/><FieldError msg={errors.contribution_amount}/></div><div className="field"><label htmlFor="gw-due">Vencimento (opcional)</label><input id="gw-due" className="input" type="date" value={g.contribution_due_date} onChange={e=>setInfo({contribution_due_date:e.target.value})}/></div></div>}
    {g.hasContribution&&status==='draft'&&<p className="muted small">As cobranças só são geradas quando a gira for publicada.</p>}
   </div>
   <details className="gw-more" open={!!(g.what_to_bring||g.notes||g.art_path||g.coverFile)}><summary>Mais detalhes (opcional): o que levar, observações e capa</summary>
    <div className="field"><label htmlFor="gw-bring">O que levar</label><textarea id="gw-bring" className="textarea" rows="3" value={g.what_to_bring} onChange={e=>setInfo({what_to_bring:e.target.value})} placeholder="Ex.: roupa branca, água…"/></div>
    <div className="field"><label htmlFor="gw-notes">Observações</label><textarea id="gw-notes" className="textarea" rows="3" value={g.notes} onChange={e=>setInfo({notes:e.target.value})}/></div>
    <div className="field"><label>Capa</label><div className="gira-cover-mode"><button type="button" className={'gira-cover-choice '+(g.coverMode==='color'?'selected':'')} onClick={()=>setInfo({coverMode:'color'})}><span className="gira-cover-swatch" style={{background:g.cover_color}}></span><span><b>Usar uma cor</b></span></button><button type="button" className={'gira-cover-choice '+(g.coverMode==='image'?'selected':'')} onClick={()=>setInfo({coverMode:'image'})}><span className="gira-cover-photo">▧</span><span><b>Usar imagem</b></span></button></div>
     {g.coverMode==='color'?<div className="gira-color-palette" style={{marginTop:10}}>{['#65745A','#8B6F47','#A65D4A','#8A6A8F','#55758A','#B78A3D','#7B5B45','#6F7F76','#9A7B67','#C8B99A'].map(c=><button type="button" key={c} aria-label={'Usar cor '+c} className={'gira-color-dot '+(String(g.cover_color).toLowerCase()===c.toLowerCase()?'selected':'')} style={{background:c}} onClick={()=>setInfo({cover_color:c})}/>)}<label className="gira-color-picker-swatch" style={{background:g.cover_color}} title="Cor personalizada"><input aria-label="Escolher cor personalizada" type="color" value={g.cover_color} onChange={e=>setInfo({cover_color:e.target.value})}/></label></div>
     :<div className="gira-cover-upload">{coverLibrary.length>0&&<div className="gira-cover-library">{coverLibrary.map(c=><button type="button" key={c.name} className={'gira-cover-library-item '+(g.art_path===c.url&&!g.coverFile?'selected':'')} onClick={()=>setInfo({art_path:c.url,coverFile:null})}><img src={c.url} alt={c.name}/><span>{c.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')}</span></button>)}</div>}<div className="gira-cover-custom"><b>Ou enviar uma nova imagem</b><input className="input" type="file" accept="image/*" onChange={e=>setInfo({coverFile:e.target.files?.[0]||null,art_path:''})}/></div></div>}
    </div>
   </details>
  </div>}

  {step==='shifts'&&<div className="card gw-panel">
   <div className="gw-panel-head"><h3>A gira possui turnos de atividades?</h3><p className="muted small">Turnos são os momentos em que os filhos ajudam na organização (preparo, limpeza…). Os membros escolhem em quais turnos podem participar.</p></div>
   <div className="gira-admin-choice-grid" role="radiogroup" aria-label="A gira possui turnos de atividades?"><button type="button" role="radio" aria-checked={hasShifts===true} className={'gira-admin-choice '+(hasShifts===true?'selected':'')} onClick={()=>chooseShifts(true)}><span className="gira-admin-choice-icon">✓</span><span><b>Sim</b><small>Vou cadastrar os turnos e as tarefas.</small></span></button><button type="button" role="radio" aria-checked={hasShifts===false} className={'gira-admin-choice '+(hasShifts===false?'selected':'')} onClick={()=>chooseShifts(false)}><span className="gira-admin-choice-icon">○</span><span><b>Não</b><small>Seguir direto para a prévia.</small></span></button></div>
   <FieldError msg={errors.hasShifts}/>
   {hasShifts===true&&<div className="gw-shifts">
    <div className="gw-subhead"><b>Turnos</b><span className="muted small">Cada turno tem apenas dia e horário.</span></div>
    {shifts.map((s,i)=><div className={'gw-shift '+(errors[s.id]?'has-error':'')} key={s.id}><span className="gw-shift-tag">{s.date&&s.time?shiftLabel(s):'Turno '+(i+1)}</span><div className="gw-shift-fields"><div className="field"><label htmlFor={'d'+s.id}>Dia</label><input id={'d'+s.id} className="input" type="date" value={s.date} onChange={e=>updateShift(s.id,{date:e.target.value})}/></div><div className="field"><label htmlFor={'t'+s.id}>Horário</label><input id={'t'+s.id} className="input" type="time" value={s.time} onChange={e=>updateShift(s.id,{time:e.target.value})}/></div><button type="button" className="btn gw-icon-btn" aria-label={'Excluir turno '+(i+1)} onClick={()=>removeShift(s)}><Trash2 size={15}/></button></div><FieldError msg={errors[s.id]}/></div>)}
    <FieldError msg={errors.list}/>
    <button type="button" className="btn gw-add" onClick={addShift}><Plus size={14}/> Adicionar turno</button>
   </div>}
   {hasShifts===false&&(shifts.length>0||tasks.length>0)&&<div className="gw-warning">Ao salvar, os turnos e as tarefas cadastrados serão removidos. Se mudar de ideia, marque <b>Sim</b> antes de avançar.</div>}
  </div>}

  {step==='activities'&&<div className="card gw-panel">
   <div className="gw-panel-head"><h3>Atividades</h3><p className="muted small">Cada tarefa pertence a um turno. As subtarefas seguem automaticamente o turno da tarefa.</p></div>
   {!tasks.length&&<div className="gw-empty"><ClipboardList size={20}/><p>Nenhuma tarefa ainda. Adicione a primeira tarefa e escolha o turno.</p></div>}
   {tasks.map((t,i)=><div className="gw-task" key={t.id}>
    <div className="gw-task-row"><span className="gw-task-num">{i+1}</span>
     <div className="field gw-task-name"><label htmlFor={'n'+t.id}>Tarefa</label><input id={'n'+t.id} className={'input '+(errors[t.id+':name']?'has-error':'')} value={t.name} onChange={e=>updateTask(t.id,{name:e.target.value})} placeholder="Ex.: Decoração do congá"/><FieldError msg={errors[t.id+':name']}/></div>
     <div className="field gw-task-shift"><label htmlFor={'s'+t.id}>Turno</label><select id={'s'+t.id} className={'select '+(errors[t.id+':shift']?'has-error':'')} value={t.shiftId} onChange={e=>updateTask(t.id,{shiftId:e.target.value})}><option value="">Escolha o turno…</option>{shifts.map(s=><option value={s.id} key={s.id}>{shiftLabel(s)}</option>)}</select><FieldError msg={errors[t.id+':shift']}/></div>
     <button type="button" className="btn gw-icon-btn" aria-label={'Excluir tarefa '+(t.name||i+1)} onClick={()=>removeTask(t)}><Trash2 size={15}/></button>
    </div>
    <div className="gw-subtasks"><span className="gw-subtasks-label">Subtarefas {t.shiftId&&shifts.find(s=>s.id===t.shiftId)?<em>· no turno {shiftLabel(shifts.find(s=>s.id===t.shiftId))}</em>:null}</span>
     {t.subtasks.map((s,j)=><div className="gw-subtask" key={s.id}><span aria-hidden="true">↳</span><input className={'input '+(errors[s.id]?'has-error':'')} aria-label={'Subtarefa '+(j+1)+' de '+(t.name||'tarefa')} value={s.name} onChange={e=>updateSubtask(t.id,s.id,e.target.value)} placeholder="Ex.: Separar as flores"/><button type="button" className="btn gw-icon-btn" aria-label="Remover subtarefa" onClick={()=>removeSubtask(t.id,s.id)}><X size={14}/></button><FieldError msg={errors[s.id]}/></div>)}
     <button type="button" className="gw-link-btn" onClick={()=>addSubtask(t.id)}><Plus size={13}/> Adicionar subtarefa</button>
    </div>
   </div>)}
   <button type="button" className="btn gw-add" onClick={addTask}><Plus size={14}/> Adicionar tarefa</button>
  </div>}

  {step==='preview'&&<div className="gw-preview">
   <div className="card gw-preview-bar"><div><b>Prévia: assim os membros verão esta gira</b><p className="muted small">Pode testar à vontade: confirmar presença, escolher turnos, marcar tarefas. Nada aqui é salvo e tudo volta ao início quando você sair da prévia.</p></div>
    {hasShifts&&<div className="gw-phase" role="group" aria-label="Simular momento"><span className="muted small">Simular:</span><button type="button" className={'btn '+(previewPhase==='choose'?'primary':'')} onClick={()=>{setPreviewPhase('choose');setPreviewKey(k=>k+1)}}>Escolha de turnos</button><button type="button" className={'btn '+(previewPhase==='day'?'primary':'')} onClick={()=>{setPreviewPhase('day');setPreviewKey(k=>k+1)}}>Dia da gira</button></div>}
    <div className="gw-jump"><span className="muted small">Editar:</span><button type="button" className="gw-link-btn" onClick={()=>goTo('info')}>Informações</button><button type="button" className="gw-link-btn" onClick={()=>goTo('shifts')}>Turnos</button>{hasShifts&&<button type="button" className="gw-link-btn" onClick={()=>goTo('activities')}>Atividades</button>}</div>
   </div>
   <div className="gw-preview-frame"><GiraDetail key={previewKey} p={p} gira={previewGira} preview={previewData} back={()=>{}}/></div>
  </div>}

  {step==='publish'&&<div className="card gw-panel">
   <div className="gw-panel-head"><h3>{status==='published'?'Publicar alterações':'Publicar gira'}</h3><p className="muted small">{status==='published'?'A gira já está na agenda. Confirme para validar e manter as alterações publicadas.':'Ao publicar, a gira aparece automaticamente no menu GIRAS dos membros.'}</p></div>
   <ul className="gw-checklist">
    <li><Check size={14}/> <span><b>{g.name}</b> · {g.date?new Date(g.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}):''} às {g.time}</span></li>
    <li><Check size={14}/> <span>{types[g.activity_type]}{selectedEntities.length?' · '+selectedEntities.map(x=>x[2]).join(', '):''}</span></li>
    <li><Check size={14}/> <span>{g.hasContribution?'Contribuição de '+money(g.contribution_amount)+' (cobranças geradas ao publicar)':'Sem contribuição'}</span></li>
    <li><Check size={14}/> <span>{hasShifts?shifts.length+' turno(s), '+tasks.length+' tarefa(s) e '+tasks.reduce((n,t)=>n+t.subtasks.length,0)+' subtarefa(s)':'Sem turnos de atividades'}</span></li>
   </ul>
   {publishState.error&&<div className="gw-warning" role="alert"><b>Não foi possível publicar:</b> {publishState.error}</div>}
   <div className="gw-jump"><span className="muted small">Quer revisar antes?</span><button type="button" className="gw-link-btn" onClick={()=>goTo('preview')}>Ver prévia</button></div>
  </div>}

  <div className="gw-actions">
   {stepIndex>0?<button type="button" className="btn" disabled={saving} onClick={prev}><ArrowLeft size={14}/> Voltar</button>:<span/>}
   <div className="gw-actions-right">
    {step!=='preview'&&step!=='publish'&&status==='draft'&&<button type="button" className="btn" disabled={saving||(!dirty&&!!id)} onClick={()=>saveCurrent(step)}><Save size={14}/> Salvar rascunho</button>}
    {step==='publish'?<button type="button" className="btn primary" disabled={publishState.busy||saving} onClick={publish}>{publishState.busy?'Publicando…':status==='published'?'Publicar alterações':'Publicar gira'}</button>
     :<button type="button" className="btn primary" disabled={saving} onClick={next}>{saving?'Salvando…':step==='preview'?'Ir para publicação':'Salvar e avançar'} <ChevronRight size={14}/></button>}
   </div>
  </div>
 </div>
}
function People(){const[people,setPeople]=useState([]),[groupsData,setGroups]=useState([]),[message,setMessage]=useState(''),[search,setSearch]=useState(''),[sort,setSort]=useState('created_desc'),[orixa,setOrixa]=useState('all'),[init,setInit]=useState('all'),[fac,setFac]=useState('all'),[group,setGroup]=useState('all');const load=async()=>{const[{data:p},{data:g}]=await Promise.all([supabase.from('profiles').select('*,groups(name)').order('created_at',{ascending:false}),supabase.from('groups').select('*').order('name')]);setPeople(p||[]);setGroups(g||[])};useEffect(()=>{load()},[]);const facilitators=[['fac_cozinha','Facilitador cozinha'],['fac_decoracao','Facilitador decoração'],['fac_comunicacao','Facilitador comunicação'],['fac_coordenacao','Facilitador coordenação'],['fac_manutencao','Facilitador manutenção']];const filtered=people.filter(p=>{const q=search.trim().toLocaleLowerCase('pt-BR');if(q&&!String(p.name||'').toLocaleLowerCase('pt-BR').includes(q))return false;if(orixa!=='all'&&(p.orixa_symbol||'')!==orixa)return false;if(init!=='all'&&String(!!p.is_iniciado)!==init)return false;if(fac!=='all'&&(fac==='none'?!p.leadership_seal:p.leadership_seal!==fac))return false;if(group!=='all'&&(p.group_id||p.groups?.id||'')!==group)return false;return true}).sort((a,b)=>{if(sort==='name')return String(a.name||'').localeCompare(String(b.name||''),'pt-BR');if(sort==='orixa')return String(a.orixa_symbol||'').localeCompare(String(b.orixa_symbol||''),'pt-BR');if(sort==='created_asc')return new Date(a.created_at||0)-new Date(b.created_at||0);return new Date(b.created_at||0)-new Date(a.created_at||0)});const save=async x=>{setMessage('');const {error}=await supabase.rpc('admin_update_profile',{p_profile_id:x.id,p_role:x.role,p_group_id:x.group_id||null,p_leadership_seal:x.leadership_seal||null,p_is_iniciado:!!x.is_iniciado,p_is_active:x.is_active!==false});if(error)setMessage(err(error));else{setMessage('Pessoa atualizada.');load()}};const clearFilters=()=>{setSearch('');setSort('created_desc');setOrixa('all');setInit('all');setFac('all');setGroup('all')};return <div><div className="row between"><div><span className="eyebrow">ADMINISTRAÇÃO</span><h2>Pessoas</h2><p className="muted small">Busque e organize os cadastros da casa.</p></div><span className="pill">{people.filter(x=>x.is_active).length} ativos</span></div>{message&&<div className="toast">{message}</div>}<div className="card people-filters"><div className="grid people-filter-grid"><Field label="Buscar por nome"><input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Digite um nome…"/></Field><Field label="Ordenar por"><select className="select" value={sort} onChange={e=>setSort(e.target.value)}><option value="created_desc">Cadastro: mais recentes</option><option value="created_asc">Cadastro: mais antigos</option><option value="name">Nome</option><option value="orixa">Orixá</option></select></Field><Field label="Orixá"><select className="select" value={orixa} onChange={e=>setOrixa(e.target.value)}><option value="all">Todos os Orixás</option>{ORIXAS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field><Field label="Iniciado"><select className="select" value={init} onChange={e=>setInit(e.target.value)}><option value="all">Todos</option><option value="true">Iniciados</option><option value="false">Não iniciados</option></select></Field><Field label="Facilitador"><select className="select" value={fac} onChange={e=>setFac(e.target.value)}><option value="all">Todos</option><option value="none">Sem facilitador</option>{facilitators.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field><Field label="Grupo"><select className="select" value={group} onChange={e=>setGroup(e.target.value)}><option value="all">Todos os grupos</option>{groupsData.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></Field></div><div className="row between" style={{marginTop:10}}><span className="muted small">{filtered.length} cadastro(s) encontrado(s)</span><button className="btn" onClick={clearFilters}>Limpar filtros</button></div></div>{filtered.map(p=><Person key={p.id} p={p} groupsData={groupsData} save={save}/>)}</div>}function FacilitatorBadge({seal}){const labels={fac_cozinha:'Facilitador cozinha',fac_decoracao:'Facilitador decoração',fac_comunicacao:'Facilitador comunicação',fac_coordenacao:'Facilitador coordenação',fac_manutencao:'Facilitador manutenção'};return seal?<span className="facilitator-badge" title={labels[seal]||'Facilitador'} aria-label={labels[seal]||'Facilitador'}>✦</span>:null}
function Person({p,groupsData,save}){const[x,setX]=useState({...p,group_id:p.group_id||p.groups?.id||'',leadership_seal:p.leadership_seal||''});const facilitators=[['fac_cozinha','Facilitador cozinha'],['fac_decoracao','Facilitador decoração'],['fac_comunicacao','Facilitador comunicação'],['fac_coordenacao','Facilitador coordenação'],['fac_manutencao','Facilitador manutenção']];return <div className="card"><div className="row"><OrixaIcon name={p.orixa_symbol} size={35}/><div><b>{p.name} <FacilitatorBadge seal={p.leadership_seal}/></b><div className="muted small">{p.email}</div><div className="muted small">{p.is_active?'Membro ativo':'Cadastro inativo'}</div></div></div><div className="grid"><Field label="Perfil"><select className="select" value={x.role} onChange={e=>setX({...x,role:e.target.value})}><option>member</option><option>editor</option><option>admin</option></select></Field><Field label="Grupo"><select className="select" value={x.group_id||''} onChange={e=>setX({...x,group_id:e.target.value})}><option value="">Organização</option>{groupsData.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></Field><Field label="Facilitador"><select className="select" value={x.leadership_seal||''} onChange={e=>setX({...x,leadership_seal:e.target.value})}><option value="">Sem função de facilitador</option>{facilitators.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field></div><div className="choice"><label className="btn"><input type="checkbox" checked={!!x.is_iniciado} onChange={e=>setX({...x,is_iniciado:e.target.checked})}/> Iniciado</label><label className="btn"><input type="checkbox" checked={x.is_active!==false} onChange={e=>setX({...x,is_active:e.target.checked})}/> Ativo</label><button className="btn primary" onClick={()=>save(x)}>Salvar</button></div></div>}// ===================================================================
// FINANCEIRO — regras compartilhadas, "Como pagar" (membro) e gestão
// ===================================================================
const FIN_DEFAULTS={monthly_amount:40,due_day:20,reminder_days:5,pix_key:'pixtpbc@gmail.com',pix_holder:''};
const ymOf=d=>{const x=d instanceof Date?d:new Date(String(d).slice(0,10)+'T12:00:00');return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')};
const ymAdd=(ym,n)=>{const[y,m]=ym.split('-').map(Number);const d=new Date(y,m-1+n,1);return ymOf(d)};
const ymLabel=(ym,withYear=true)=>new Date(ym+'-01T12:00:00').toLocaleDateString('pt-BR',withYear?{month:'long',year:'numeric'}:{month:'long'});
const upperFirst=s=>s?s[0].toUpperCase()+s.slice(1):s;
function useFinanceSettings(){const[s,setS]=useState(FIN_DEFAULTS);const reload=async()=>{const{data}=await supabase.from('finance_settings').select('*').eq('id',1).maybeSingle();if(data)setS({...FIN_DEFAULTS,...data})};useEffect(()=>{reload()},[]);return [s,reload]}
// Quem paga mensalidade no mês (mesma regra do banco)
function payerMode(p){return p?.is_financial_payer===false?'never':p?.financial_start_month?'from':'always'}
function paysInMonth(p,ym){if(!p||p.is_active===false||p.is_pai_de_santo||p.is_financial_payer===false)return false;const start=p.financial_start_month?String(p.financial_start_month).slice(0,7):'';if(start&&ym<start)return false;if(p.date_of_birth){const b=new Date(p.date_of_birth+'T12:00:00');const adult=ymOf(new Date(b.getFullYear()+18,b.getMonth(),1));if(ym<adult)return false}return true}
// Mensalidade do mês vira atraso a partir do dia de vencimento
function isMonthOverdue(ym,settings,today=new Date()){const cur=ymOf(today);return ym<cur||(ym===cur&&today.getDate()>=settings.due_day)}
// Itens em aberto do membro (mensalidades até o mês atual + outras cobranças)
function memberOpenItems(p,dues,charges,proofs,settings,today=new Date()){
 const cur=ymOf(today),items=[],pendingMonthly={},pendingExtra={};
 (proofs||[]).filter(x=>x.status==='pending').forEach(x=>{if(x.kind==='monthly')pendingMonthly[String(x.reference_month).slice(0,7)]=x;else pendingExtra[x.extra_charge_id]=x});
 const months=new Set((dues||[]).filter(d=>d.status==='unpaid').map(d=>String(d.reference_month).slice(0,7)));
 if(paysInMonth(p,cur)&&!(dues||[]).some(d=>String(d.reference_month).slice(0,7)===cur&&d.status!=='unpaid'))months.add(cur);
 [...months].filter(m=>m<=cur&&paysInMonth(p,m)).sort().forEach(m=>items.push({key:'m'+m,kind:'monthly',ref:m+'-01',ym:m,description:'Mensalidade de '+ymLabel(m,m.slice(0,4)!==String(today.getFullYear())),amount:Number(settings.monthly_amount),overdue:isMonthOverdue(m,settings,today),dueText:'vence dia '+settings.due_day+'/'+m.slice(5,7),proof:pendingMonthly[m]}));
 (charges||[]).filter(c=>c.status!=='paid'&&c.status!=='not_applicable').forEach(c=>items.push({key:'e'+c.id,kind:'extra',id:c.id,description:c.description,amount:Number(c.amount),overdue:!!c.due_date&&new Date(c.due_date+'T23:59:59')<today,dueText:c.due_date?'vence '+new Date(c.due_date+'T12:00:00').toLocaleDateString('pt-BR'):'sem vencimento',proof:pendingExtra[c.id]}));
 return items;
}
// Comprime a foto no celular antes de enviar (máx. 1400px, JPEG)
async function compressProof(file){
 if(file.type==='application/pdf'){if(file.size>1.5*1024*1024)throw new Error('O PDF é grande demais (máx. 1,5 MB). Envie uma foto ou print do comprovante.');return {blob:file,ext:'pdf',type:'application/pdf'}}
 if(!file.type.startsWith('image/'))throw new Error('Envie uma foto, print ou PDF do comprovante.');
 const url=URL.createObjectURL(file);try{const img=await new Promise((ok,bad)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>bad(new Error('Não foi possível ler a imagem.'));i.src=url});
  const scale=Math.min(1,1400/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
  const blob=await new Promise(ok=>c.toBlob(ok,'image/jpeg',0.72));return {blob,ext:'jpg',type:'image/jpeg'}}finally{URL.revokeObjectURL(url)}
}

function PayModal({p,settings,items,onClose,onSent}){
 const[copied,setCopied]=useState(false),[busy,setBusy]=useState(''),[msg,setMsg]=useState(''),[sent,setSent]=useState({});
 const copy=async()=>{try{await navigator.clipboard.writeText(settings.pix_key)}catch(e){const t=document.createElement('textarea');t.value=settings.pix_key;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}setCopied(true);setTimeout(()=>setCopied(false),2500)};
 const total=items.filter(x=>!x.proof&&!sent[x.key]).reduce((n,x)=>n+x.amount,0);
 const upload=async(item,file)=>{if(!file||busy)return;setBusy(item.key);setMsg('');try{const{blob,ext,type}=await compressProof(file);const path=p.id+'/'+Date.now()+'-'+item.key+'.'+ext;const{error:ue}=await supabase.storage.from('comprovantes').upload(path,blob,{contentType:type,upsert:false});if(ue)throw ue;
   const{error}=await supabase.rpc('submit_payment_proof',{p_kind:item.kind,p_reference_month:item.kind==='monthly'?item.ref:null,p_extra_charge_id:item.kind==='extra'?item.id:null,p_file_path:path});if(error){await supabase.storage.from('comprovantes').remove([path]);throw error}
   if(item.proof?.file_path&&item.proof.file_path!==path)supabase.storage.from('comprovantes').remove([item.proof.file_path]);
   setSent(v=>({...v,[item.key]:true}));onSent&&onSent()}catch(e){setMsg(err(e))}finally{setBusy('')}};
 return <div className="modal-back" onClick={onClose}><div className="modal fn-pay" role="dialog" aria-modal="true" aria-labelledby="fn-pay-title" onClick={e=>e.stopPropagation()}>
  <div className="row between"><h3 id="fn-pay-title" style={{margin:0}}>Como pagar</h3><button className="btn" onClick={onClose} aria-label="Fechar"><X size={15}/></button></div>
  {total>0&&<div className="fn-total"><small>Total em aberto</small><b>{money(total)}</b></div>}
  <div className="fn-pix"><small>Chave Pix (e-mail)</small><div className="fn-pix-row"><b>{settings.pix_key}</b><button className="btn primary" onClick={copy}>{copied?<><Check size={14}/> Copiada</>:'Copiar chave'}</button></div>{settings.pix_holder&&<small className="muted">Titular: {settings.pix_holder}</small>}</div>
  <ol className="fn-steps"><li>Toque em <b>Copiar chave</b> e cole no app do seu banco, na opção Pix.</li><li>Pague o valor exato de cada item abaixo.</li><li>Volte aqui e toque em <b>Já paguei</b> para enviar o comprovante (foto ou print).</li></ol>
  {msg&&<div className="gw-warning">{msg}</div>}
  <div className="fn-items">{items.length?items.map(x=>{const done=sent[x.key]||x.proof;return <div className={'fn-item'+(x.overdue&&!done?' is-overdue':'')} key={x.key}><div className="fn-item-text"><b>{x.description}</b><small>{money(x.amount)} · {x.overdue&&!done?'em atraso':x.dueText}</small></div>
   {done?<span className="fn-chip is-wait">{sent[x.key]?'Enviado ✓':'Em análise'}</span>:<label className={'btn'+(busy===x.key?' is-busy':'')}><input type="file" accept="image/*,application/pdf" hidden disabled={!!busy} onChange={e=>{upload(x,e.target.files?.[0]);e.target.value=''}}/>{busy===x.key?'Enviando…':<><Upload size={14}/> Já paguei</>}</label>}
   {x.proof&&!sent[x.key]&&<label className="fn-resend"><input type="file" accept="image/*,application/pdf" hidden disabled={!!busy} onChange={e=>{upload(x,e.target.files?.[0]);e.target.value=''}}/>trocar comprovante</label>}
  </div>}):<p className="muted">Nenhum pagamento em aberto. Obrigado! 🙏</p>}</div>
  <p className="muted small" style={{marginTop:12}}>Depois do envio, a gestão confere e você é avisado aqui no app.</p>
 </div></div>
}

// Dados financeiros do membro para a tela inicial e "Meu financeiro"
function useMemberFinance(p){
 const[settings]=useFinanceSettings();const[data,setData]=useState({dues:[],charges:[],proofs:[],loaded:false});
 const load=async()=>{if(!p?.id)return;const now=new Date();if(paysInMonth(p,ymOf(now))){await supabase.rpc('sync_my_monthly_dues',{p_reference_month:ymOf(now)+'-01'})}
  const[{data:d},{data:c},{data:pr}]=await Promise.all([supabase.from('monthly_dues').select('reference_month,status').eq('profile_id',p.id),supabase.from('extra_charges').select('id,description,amount,status,due_date,created_at').eq('profile_id',p.id).order('created_at',{ascending:false}),supabase.from('payment_proofs').select('id,kind,reference_month,extra_charge_id,description,amount,status,reject_reason,reviewed_at,member_seen_at,file_path,created_at').eq('profile_id',p.id).order('created_at',{ascending:false}).limit(50)]);
  setData({dues:d||[],charges:c||[],proofs:pr||[],loaded:true})};
 useEffect(()=>{load()},[p?.id]);
 const items=memberOpenItems(p,data.dues,data.charges,data.proofs,settings);
 const reviewed=data.proofs.filter(x=>x.status!=='pending'&&!x.member_seen_at&&x.reviewed_at&&Date.now()-new Date(x.reviewed_at)<30*86400000);
 return {settings,items,reviewed,reload:load,loaded:data.loaded,dues:data.dues,charges:data.charges,proofs:data.proofs};
}

// ----------------------------- GESTÃO -----------------------------
function AdminFinance(){
 const[settings,reloadSettings]=useFinanceSettings();
 const[people,setPeople]=useState([]),[dues,setDues]=useState([]),[charges,setCharges]=useState([]),[giras,setGiras]=useState([]),[pendingCount,setPendingCount]=useState(0),[tab,setTab]=useState('overview'),[month,setMonth]=useState(ymOf(new Date())),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[showSettings,setShowSettings]=useState(false);
 const load=async()=>{const[{data:p},{data:d},{data:c},{data:g},{data:pr}]=await Promise.all([supabase.from('profiles').select('id,name,date_of_birth,is_active,is_pai_de_santo,is_financial_payer,financial_start_month,orixa_symbol').eq('is_active',true).order('name'),supabase.from('monthly_dues').select('profile_id,reference_month,status').limit(10000),supabase.from('extra_charges').select('*').order('created_at',{ascending:false}).limit(10000),supabase.from('giras').select('id,name,starts_at').order('starts_at',{ascending:false}).limit(60),supabase.rpc('admin_list_payment_proofs',{p_status:'pending'})]);
  setPeople(p||[]);setDues(d||[]);setCharges(c||[]);setGiras(g||[]);setPendingCount((pr||[]).length);setLoading(false)};
 useEffect(()=>{supabase.rpc('sync_current_monthly_dues').then(load)},[]);
 const dueStatus=(pid,ym)=>dues.find(x=>x.profile_id===pid&&String(x.reference_month).slice(0,7)===ym)?.status||'unpaid';
 const tabs=[['overview','Visão geral'],['monthly','Mensalidades'],['extra','Outras cobranças'],['proofs','Comprovantes'],['people','Pessoas']];
 const ctx={people,dues,charges,giras,settings,month,setMonth,dueStatus,reload:load,setMessage,setTab,pendingCount};
 return <div className="fn-admin">
  <div className="row between gira-admin-header"><div><span className="eyebrow">GESTÃO DA CASA</span><h2>Financeiro</h2></div><button className="btn" onClick={()=>setShowSettings(v=>!v)}>{showSettings?'Fechar configurações':'Configurações'}</button></div>
  {showSettings&&<FinanceSettingsCard settings={settings} onSaved={()=>{reloadSettings();setShowSettings(false);setMessage('Configurações salvas.')}}/>}
  <div className="mu-chips fn-tabs">{tabs.map(([k,l])=><button type="button" key={k} className={'mu-chip'+(tab===k?' is-on':'')} onClick={()=>{setTab(k);setMessage('')}}>{l}{k==='proofs'&&pendingCount>0&&<i className="bl-dot-count">{pendingCount}</i>}</button>)}</div>
  {message&&<div className="toast">{message}</div>}
  {loading?<div className="hm-skeleton"/>:<>
   {tab==='overview'&&<FinanceOverview {...ctx}/>}
   {tab==='monthly'&&<FinanceMonthly {...ctx}/>}
   {tab==='extra'&&<FinanceExtras {...ctx}/>}
   {tab==='proofs'&&<FinanceProofs {...ctx}/>}
   {tab==='people'&&<FinancePeople {...ctx}/>}
  </>}
 </div>
}

function MonthPicker({month,setMonth}){return <div className="fn-month"><button type="button" className="ag-nav" aria-label="Mês anterior" onClick={()=>setMonth(ymAdd(month,-1))}><ArrowLeft size={16}/></button><b>{upperFirst(ymLabel(month))}</b><button type="button" className="ag-nav" aria-label="Próximo mês" onClick={()=>setMonth(ymAdd(month,1))}><ChevronRight size={17}/></button></div>}

function FinanceOverview({people,dues,charges,settings,month,setMonth,dueStatus,setTab,pendingCount}){
 const today=new Date(),cur=ymOf(today);
 const payers=people.filter(p=>paysInMonth(p,month)),nonPayers=people.filter(p=>!paysInMonth(p,cur));
 const paid=payers.filter(p=>dueStatus(p.id,month)==='paid');
 const pct=payers.length?Math.round(paid.length/payers.length*100):0;
 const late=people.map(p=>{const months=dues.filter(d=>d.profile_id===p.id&&d.status==='unpaid').map(d=>String(d.reference_month).slice(0,7)).filter(m=>paysInMonth(p,m)&&isMonthOverdue(m,settings,today));const extras=charges.filter(c=>c.profile_id===p.id&&c.status==='unpaid'&&c.due_date&&new Date(c.due_date+'T23:59:59')<today);return {p,months,extras,total:months.length*Number(settings.monthly_amount)+extras.reduce((n,c)=>n+Number(c.amount),0)}}).filter(x=>x.months.length||x.extras.length).sort((a,b)=>b.total-a.total);
 const openExtras=charges.filter(c=>c.status==='unpaid');
 const[showAllLate,setShowAllLate]=useState(false);
 return <div>
  <MonthPicker month={month} setMonth={setMonth}/>
  <div className="fn-kpis">
   <div className="fn-kpi"><small>Saúde de {ymLabel(month,false)}</small><b>{pct}%</b><small>{paid.length} de {payers.length} pagaram · {money(paid.length*settings.monthly_amount)}</small><span className="bl-bar"><i style={{width:pct+'%'}}/></span></div>
   <div className="fn-kpi"><small>Falta receber no mês</small><b>{money((payers.length-paid.length)*settings.monthly_amount)}</b><small>{payers.length-paid.length} mensalidade(s)</small></div>
   <div className="fn-kpi"><small>Em atraso</small><b className={late.length?'is-bad':''}>{late.length} {late.length===1?'pessoa':'pessoas'}</b><small>{money(late.reduce((n,x)=>n+x.total,0))} vencidos</small></div>
   <div className="fn-kpi"><small>Pagantes hoje</small><b>{people.length-nonPayers.length}</b><small>{nonPayers.length} não pagante(s)</small></div>
  </div>
  {pendingCount>0&&<button type="button" className="hm-att hm-att-info" style={{marginTop:12}} onClick={()=>setTab('proofs')}><span className="hm-att-icon"><FileText size={19}/></span><span className="hm-att-text"><b>{pendingCount} comprovante(s) para conferir</b></span><span className="hm-att-cta">Conferir<ChevronRight size={15}/></span></button>}
  <h3 className="fn-h">Quem está em atraso</h3>
  {late.length?<div className="fn-list">{(showAllLate?late:late.slice(0,6)).map(x=><div className="fn-row" key={x.p.id}><span className="fn-row-main"><b>{x.p.name}</b><small>{[x.months.length?x.months.length+' mensalidade(s)':'',x.extras.length?x.extras.length+' cobrança(s)':''].filter(Boolean).join(' · ')}</small></span><span className={'fn-chip '+(x.months.length+x.extras.length>=3?'is-bad':'is-warn')}>{money(x.total)}</span></div>)}{late.length>6&&<button className="gw-link-btn" onClick={()=>setShowAllLate(v=>!v)}>{showAllLate?'Ver menos':'Ver todas as '+late.length+' pessoas'}</button>}</div>:<div className="hm-clear"><Check size={18}/><span>Ninguém em atraso.</span></div>}
  <h3 className="fn-h">Outras cobranças em aberto</h3>
  <p className="muted">{openExtras.length?openExtras.length+' cobrança(s) · '+money(openExtras.reduce((n,c)=>n+Number(c.amount),0))+' a receber':'Nenhuma cobrança em aberto.'}</p>
 </div>
}

function FinanceMonthly({people,settings,month,setMonth,dueStatus,reload,setMessage}){
 const[filter,setFilter]=useState('all'),[search,setSearch]=useState(''),[busy,setBusy]=useState('');
 const rows=people.map(p=>{const pays=paysInMonth(p,month);const st=!pays?'na':dueStatus(p.id,month)==='paid'?'paid':dueStatus(p.id,month)==='not_applicable'?'na':'open';return {p,st,late:st==='open'&&isMonthOverdue(month,settings)}});
 const q=search.trim().toLocaleLowerCase('pt-BR');
 const shown=rows.filter(r=>(filter==='all'||r.st===filter)&&(!q||r.p.name.toLocaleLowerCase('pt-BR').includes(q)));
 const count=k=>rows.filter(r=>r.st===k).length;
 const toggle=async r=>{if(busy)return;setBusy(r.p.id);const{error}=await supabase.rpc('admin_set_monthly_dues',{p_profile_id:r.p.id,p_reference_month:month+'-01',p_status:r.st==='paid'?'unpaid':'paid'});setBusy('');if(error)setMessage(err(error));else{setMessage(r.st==='paid'?'Baixa desfeita.':'Baixa registrada para '+r.p.name+'.');reload()}};
 return <div>
  <MonthPicker month={month} setMonth={setMonth}/>
  <div className="mu-chips">{[['all','Todos',rows.length],['paid','Pagos',count('paid')],['open','Pendentes',count('open')],['na','Não se aplica',count('na')]].map(([k,l,n])=><button type="button" key={k} className={'mu-chip'+(filter===k?' is-on':'')} onClick={()=>setFilter(k)}>{l} · {n}</button>)}</div>
  <input className="input" placeholder="Buscar pelo nome…" value={search} onChange={e=>setSearch(e.target.value)} style={{margin:'4px 0 8px'}}/>
  <div className="fn-list">{shown.map(r=><div className="fn-row" key={r.p.id}><span className="fn-row-main"><b>{r.p.name}</b><small>{r.st==='paid'?'Pago':r.st==='na'?'Não se aplica':r.late?'Em atraso':'Em aberto'}</small></span>{r.st!=='na'&&<button className={'btn'+(r.st==='paid'?'':' primary')} disabled={busy===r.p.id} onClick={()=>toggle(r)}>{busy===r.p.id?'…':r.st==='paid'?'Desfazer':'Dar baixa'}</button>}</div>)}{!shown.length&&<p className="muted">Ninguém nesta lista.</p>}</div>
  <p className="muted small">Use "Dar baixa" para pagamentos em dinheiro. Pagamentos com comprovante são baixados automaticamente ao confirmar.</p>
 </div>
}

function FinanceExtras({people,charges,giras,reload,setMessage}){
 const[form,setForm]=useState(null),[busy,setBusy]=useState(false),[openBatch,setOpenBatch]=useState(null),[search,setSearch]=useState('');
 const groups={};charges.forEach(c=>{const k=c.batch_id||c.id;(groups[k]??=[]).push(c)});
 const list=Object.entries(groups).map(([k,items])=>({k,items,first:items[0],paid:items.filter(x=>x.status==='paid').length})).sort((a,b)=>new Date(b.first.created_at)-new Date(a.first.created_at));
 const blank={description:'',amount:'',due_date:'',target:'all',ids:[],gira_id:''};
 const create=async()=>{if(busy)return;if(!form.description.trim()||!(Number(form.amount)>0)){setMessage('Informe a descrição e um valor maior que zero.');return}if(form.target==='specific'&&!form.ids.length){setMessage('Escolha pelo menos uma pessoa.');return}
  setBusy(true);const{error}=await supabase.rpc('admin_create_extra_charge_batch',{p_profile_ids:form.target==='all'?[]:form.ids,p_description:form.description.trim(),p_amount:Number(form.amount),p_due_date:form.due_date||null,p_gira_id:form.gira_id||null,p_scope:form.target});setBusy(false);if(error){setMessage(err(error));return}setForm(null);setMessage('Cobrança criada.');reload()};
 const toggle=async c=>{const{error}=await supabase.rpc('admin_set_extra_charge_status',{p_charge_id:c.id,p_status:c.status==='paid'?'unpaid':'paid'});if(error)setMessage(err(error));else reload()};
 const removeBatch=async g=>{if(!confirm('Excluir a cobrança "'+g.first.description+'" de todas as pessoas?'))return;const{error}=g.first.batch_id?await supabase.rpc('admin_delete_extra_charge_batch',{p_batch_id:g.first.batch_id}):await supabase.rpc('admin_delete_extra_charge',{p_charge_id:g.first.id});if(error)setMessage(err(error));else{setMessage('Cobrança excluída.');setOpenBatch(null);reload()}};
 const name=id=>people.find(p=>p.id===id)?.name||'Pessoa';
 if(form){const q=search.trim().toLocaleLowerCase('pt-BR');const found=people.filter(p=>!p.is_pai_de_santo&&!form.ids.includes(p.id)&&q&&p.name.toLocaleLowerCase('pt-BR').includes(q)).slice(0,8);
  return <div className="card gw-panel">
   <h3 style={{marginTop:0}}>Nova cobrança</h3>
   <div className="field"><label htmlFor="fx-d">Descrição</label><input id="fx-d" className="input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ex.: Materiais da festa de Exu"/></div>
   <div className="grid"><div className="field"><label htmlFor="fx-a">Valor (R$)</label><input id="fx-a" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div><div className="field"><label htmlFor="fx-v">Vencimento</label><input id="fx-v" className="input" type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></div></div>
   <div className="field"><label>Cobrar de</label><div className="bl-seg"><button type="button" className={form.target==='all'?'is-on':''} onClick={()=>setForm({...form,target:'all'})}>Todos os pagantes</button><button type="button" className={form.target==='specific'?'is-on':''} onClick={()=>setForm({...form,target:'specific'})}>Pessoas específicas</button></div>
    {form.target==='specific'&&<><input className="input" placeholder="Buscar pelo nome…" value={search} onChange={e=>setSearch(e.target.value)}/>{found.length>0&&<div className="fn-found">{found.map(p=><button type="button" key={p.id} onClick={()=>{setForm({...form,ids:[...form.ids,p.id]});setSearch('')}}><Plus size={13}/> {p.name}</button>)}</div>}<div className="fn-selected">{form.ids.map(id=><span key={id} className="fn-chip is-ok">{name(id)} <button type="button" aria-label={'Remover '+name(id)} onClick={()=>setForm({...form,ids:form.ids.filter(x=>x!==id)})}>×</button></span>)}</div></>}
    {form.target==='all'&&<p className="muted small">Vai para todas as pessoas que pagam mensalidade (inclusive quem entrar depois).</p>}</div>
   <div className="field"><label htmlFor="fx-g">Vincular a uma gira (opcional)</label><select id="fx-g" className="select" value={form.gira_id} onChange={e=>setForm({...form,gira_id:e.target.value})}><option value="">Nenhuma</option>{giras.map(g=><option key={g.id} value={g.id}>{g.name} · {new Date(g.starts_at).toLocaleDateString('pt-BR')}</option>)}</select></div>
   <div className="gw-actions"><button className="btn" onClick={()=>setForm(null)}>Cancelar</button><button className="btn primary" disabled={busy} onClick={create}>{busy?'Criando…':'Criar cobrança'}</button></div>
  </div>}
 return <div>
  <button className="btn primary" onClick={()=>{setForm(blank);setSearch('')}}><Plus size={14}/> Nova cobrança</button>
  <div className="fn-list" style={{marginTop:12}}>{list.map(g=><div key={g.k} className="fn-batch">
   <button type="button" className="fn-row fn-row-btn" onClick={()=>setOpenBatch(openBatch===g.k?null:g.k)}><span className="fn-row-main"><b>{g.first.description}</b><small>{money(g.first.amount)} · {g.first.due_date?'vence '+new Date(g.first.due_date+'T12:00:00').toLocaleDateString('pt-BR'):'sem vencimento'} · {g.first.scope==='all'?'todos':'específicas'}</small></span><span className={'fn-chip '+(g.paid===g.items.length?'is-ok':'is-warn')}>{g.paid}/{g.items.length} pagaram</span></button>
   {openBatch===g.k&&<div className="fn-batch-body">{g.items.map(c=><div className="fn-row" key={c.id}><span className="fn-row-main"><b>{name(c.profile_id)}</b><small>{c.status==='paid'?'Pago':'Em aberto'}</small></span><button className={'btn'+(c.status==='paid'?'':' primary')} onClick={()=>toggle(c)}>{c.status==='paid'?'Desfazer':'Dar baixa'}</button></div>)}<button className="btn danger" style={{marginTop:8}} onClick={()=>removeBatch(g)}><Trash2 size={14}/> Excluir cobrança</button></div>}
  </div>)}{!list.length&&<p className="muted">Nenhuma cobrança criada ainda.</p>}</div>
 </div>
}

function FinanceProofs({reload,setMessage}){
 const[rows,setRows]=useState(null),[urls,setUrls]=useState({}),[busy,setBusy]=useState(''),[view,setView]=useState(null),[status,setStatus]=useState('pending');
 const load=async()=>{const{data,error}=await supabase.rpc('admin_list_payment_proofs',{p_status:status});if(error){setMessage(err(error));setRows([]);return}setRows(data||[]);const map={};await Promise.all((data||[]).filter(x=>!x.file_deleted_at).map(async x=>{const{data:s}=await supabase.storage.from('comprovantes').createSignedUrl(x.file_path,900);if(s?.signedUrl)map[x.id]=s.signedUrl}));setUrls(map)};
 useEffect(()=>{load()},[status]);
 // limpeza: apaga arquivos conferidos há mais de 30 dias
 useEffect(()=>{(async()=>{const{data}=await supabase.rpc('admin_payment_proofs_to_purge');if(!data?.length)return;const{error}=await supabase.storage.from('comprovantes').remove(data.map(x=>x.file_path));if(!error)await supabase.rpc('admin_mark_proof_files_deleted',{p_ids:data.map(x=>x.id)})})()},[]);
 const review=async(x,approve)=>{if(busy)return;let reason=null;if(!approve){reason=window.prompt('Motivo da recusa (a pessoa vai ver esta mensagem):','O valor não confere');if(reason===null)return;if(!reason.trim()){alert('Informe o motivo.');return}}
  setBusy(x.id);const{error}=await supabase.rpc('admin_review_payment_proof',{p_id:x.id,p_approve:approve,p_reason:reason});setBusy('');if(error){setMessage(err(error));return}setMessage(approve?'Pagamento de '+x.name+' confirmado e baixado.':'Comprovante recusado. '+x.name+' será avisado(a).');setView(null);load();reload()};
 const isPdf=x=>/\.pdf$/i.test(x.file_path);
 return <div>
  <div className="bl-seg bl-seg-sm" style={{marginBottom:12}}><button className={status==='pending'?'is-on':''} onClick={()=>setStatus('pending')}>Para conferir</button><button className={status==='all'?'is-on':''} onClick={()=>setStatus('all')}>Histórico</button></div>
  {rows===null?<div className="hm-skeleton"/>:!rows.length?<div className="hm-clear"><Check size={18}/><span>{status==='pending'?'Nenhum comprovante esperando conferência.':'Nada por aqui ainda.'}</span></div>:
  <div className="fn-list">{rows.map(x=><div className="fn-proof" key={x.id}>
   <button type="button" className="fn-thumb" onClick={()=>urls[x.id]&&(isPdf(x)?window.open(urls[x.id],'_blank'):setView(x))} aria-label="Ver comprovante">{x.file_deleted_at?<small>apagado</small>:isPdf(x)?<FileText size={20}/>:urls[x.id]?<img src={urls[x.id]} alt=""/>:<small>…</small>}</button>
   <span className="fn-row-main"><b>{x.name}</b><small>{x.description} · {money(x.amount)}</small><small className="muted">{x.status==='pending'?'enviado '+new Date(x.created_at).toLocaleDateString('pt-BR'):(x.status==='approved'?'confirmado':'recusado')+(x.reviewer_name?' por '+x.reviewer_name:'')+' em '+new Date(x.reviewed_at).toLocaleDateString('pt-BR')}{x.reject_reason?' · '+x.reject_reason:''}</small></span>
   {x.status==='pending'&&<span className="fn-proof-actions"><button className="btn" disabled={busy===x.id} aria-label="Recusar" onClick={()=>review(x,false)}><X size={15}/></button><button className="btn primary" disabled={busy===x.id} aria-label="Confirmar" onClick={()=>review(x,true)}><Check size={15}/></button></span>}
  </div>)}</div>}
  {view&&<div className="modal-back" onClick={()=>setView(null)}><div className="modal fn-proof-view" onClick={e=>e.stopPropagation()}><div className="row between"><b>{view.name} · {view.description}</b><button className="btn" onClick={()=>setView(null)} aria-label="Fechar"><X size={15}/></button></div><img src={urls[view.id]} alt={'Comprovante de '+view.name}/>{view.status==='pending'&&<div className="row" style={{justifyContent:'flex-end',marginTop:10}}><button className="btn" onClick={()=>review(view,false)}>Recusar</button><button className="btn primary" onClick={()=>review(view,true)}>Confirmar pagamento</button></div>}</div></div>}
  <p className="muted small" style={{marginTop:12}}>Os arquivos são apagados automaticamente 30 dias depois da conferência. O registro do pagamento continua.</p>
 </div>
}

function FinancePeople({people,reload,setMessage}){
 const[search,setSearch]=useState(''),[open,setOpen]=useState(null),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false);
 const q=search.trim().toLocaleLowerCase('pt-BR');const shown=people.filter(p=>!q||p.name.toLocaleLowerCase('pt-BR').includes(q));
 const label=p=>p.is_pai_de_santo?'Pai/Mãe de Santo · não paga':payerMode(p)==='never'?'Não se aplica':payerMode(p)==='from'?'A partir de '+ymLabel(String(p.financial_start_month).slice(0,7)):'Paga sempre';
 const tone=p=>p.is_pai_de_santo||payerMode(p)==='never'?'':payerMode(p)==='from'?'is-warn':'is-ok';
 const start=p=>{setOpen(p.id);setDraft({mode:payerMode(p),month:p.financial_start_month?String(p.financial_start_month).slice(0,7):ymOf(new Date())})};
 const save=async p=>{if(busy)return;setBusy(true);const{error}=await supabase.rpc('admin_set_finance_mode',{p_profile_id:p.id,p_mode:draft.mode,p_start_month:draft.mode==='from'?draft.month+'-01':null});setBusy(false);if(error){setMessage(err(error));return}setMessage('Configuração de '+p.name+' salva.');setOpen(null);reload()};
 return <div>
  <input className="input" placeholder="Buscar pelo nome…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:8}}/>
  <div className="fn-list">{shown.map(p=><div key={p.id} className="fn-batch">
   <button type="button" className="fn-row fn-row-btn" disabled={p.is_pai_de_santo} onClick={()=>open===p.id?setOpen(null):start(p)}><span className="fn-row-main"><b>{p.name}</b></span><span className={'fn-chip '+tone(p)}>{label(p)}</span></button>
   {open===p.id&&draft&&<div className="fn-batch-body">
    <p className="muted small" style={{margin:'0 0 6px'}}>Paga mensalidade?</p>
    <div className="bl-seg">{[['always','Sempre'],['from','A partir de…'],['never','Não se aplica']].map(([k,l])=><button type="button" key={k} className={draft.mode===k?'is-on':''} onClick={()=>setDraft({...draft,mode:k})}>{l}</button>)}</div>
    {draft.mode==='from'&&<div className="field"><label htmlFor={'m'+p.id}>Começa em</label><input id={'m'+p.id} className="input" type="month" value={draft.month} onChange={e=>setDraft({...draft,month:e.target.value})}/><small className="muted">Meses antes disso não contam como dívida.</small></div>}
    {draft.mode==='never'&&<p className="muted small">Não entra na conta de mensalidades. Cobranças específicas ainda podem ser enviadas a esta pessoa.</p>}
    <div className="row" style={{justifyContent:'flex-end'}}><button className="btn" onClick={()=>setOpen(null)}>Cancelar</button><button className="btn primary" disabled={busy} onClick={()=>save(p)}>{busy?'Salvando…':'Salvar'}</button></div>
   </div>}
  </div>)}</div>
 </div>
}

function FinanceSettingsCard({settings,onSaved}){
 const[f,setF]=useState({...settings}),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const save=async()=>{if(!(Number(f.monthly_amount)>=0)||!(Number(f.due_day)>=1&&Number(f.due_day)<=28)||!String(f.pix_key||'').trim()){setMsg('Confira os valores: dia de 1 a 28 e chave Pix preenchida.');return}setBusy(true);const{error}=await supabase.rpc('admin_save_finance_settings',{p:{monthly_amount:Number(f.monthly_amount),due_day:Number(f.due_day),reminder_days:Number(f.reminder_days),pix_key:f.pix_key,pix_holder:f.pix_holder||''}});setBusy(false);if(error)setMsg(err(error));else onSaved()};
 return <div className="card gw-panel"><h3 style={{marginTop:0}}>Configurações do financeiro</h3>
  <div className="grid"><div className="field"><label htmlFor="fs-a">Mensalidade (R$)</label><input id="fs-a" className="input" type="number" min="0" step="0.01" value={f.monthly_amount} onChange={e=>setF({...f,monthly_amount:e.target.value})}/></div><div className="field"><label htmlFor="fs-d">Vence todo dia</label><input id="fs-d" className="input" type="number" min="1" max="28" value={f.due_day} onChange={e=>setF({...f,due_day:e.target.value})}/></div></div>
  <div className="field"><label htmlFor="fs-r">Lembrete quantos dias antes</label><input id="fs-r" className="input" type="number" min="0" max="15" value={f.reminder_days} onChange={e=>setF({...f,reminder_days:e.target.value})}/></div>
  <div className="grid"><div className="field"><label htmlFor="fs-k">Chave Pix</label><input id="fs-k" className="input" value={f.pix_key} onChange={e=>setF({...f,pix_key:e.target.value})}/></div><div className="field"><label htmlFor="fs-h">Nome do titular (opcional)</label><input id="fs-h" className="input" value={f.pix_holder||''} onChange={e=>setF({...f,pix_holder:e.target.value})}/></div></div>
  {msg&&<div className="gw-warning">{msg}</div>}
  <div className="row" style={{justifyContent:'flex-end'}}><button className="btn primary" disabled={busy} onClick={save}>{busy?'Salvando…':'Salvar configurações'}</button></div>
 </div>
}
function Invites(){const[items,setItems]=useState([]),[role,setRole]=useState('member'),[code,setCode]=useState(''),[message,setMessage]=useState(''),[copied,setCopied]=useState(false);const load=async()=>{const {data}=await supabase.from('invitations').select('*').order('created_at',{ascending:false});setItems(data||[])};useEffect(()=>{load()},[]);const appLink=()=>window.location.origin+import.meta.env.BASE_URL;const invitationText=code=>`Olá! 💙 Você foi convidado(a) para fazer parte do Terreiro Pai Benedito do Congo.

Para entrar no aplicativo, acesse:
${appLink()}

Use o código de convite:
${code}

O código é individual e deve ser utilizado no seu cadastro.`;const create=async()=>{setMessage('');setCopied(false);const {data,error}=await supabase.rpc('admin_create_invitation',{p_role:role,p_intended_name:null,p_intended_email:null});if(error)setMessage(err(error));else{const newCode=Array.isArray(data)?data[0]?.code:data?.code;setCode(newCode||'');load()}};const copy=async()=>{if(!code)return;await navigator.clipboard.writeText(invitationText(code));setCopied(true);setTimeout(()=>setCopied(false),2200)};const remove=async x=>{if(x.status!=='active')return;if(!confirm('Excluir este convite que ainda não foi utilizado?'))return;const{error}=await supabase.rpc('admin_delete_invitation',{p_invitation_id:x.id});if(error)setMessage(err(error));else{setMessage('Convite excluído.');load()}};return <div><div className="row between"><div><span className="eyebrow">ACESSO À CASA</span><h2>Convites</h2><p className="muted">Crie um convite e envie a mensagem pronta para quem vai entrar no aplicativo.</p></div></div>{message&&<div className="toast">{message}</div>}<div className="card"><Field label="Perfil"><select className="select" value={role} onChange={e=>setRole(e.target.value)}><option value="member">Membro</option><option value="editor">Editor</option><option value="admin">Administrador</option></select></Field><button className="btn primary" onClick={create}><Plus size={14}/> Criar convite</button></div>{code&&<div className="card"><div className="row between"><div><span className="eyebrow">NOVO CONVITE</span><h3>{code}</h3><p className="muted small">Link: {appLink()}</p></div><span className="pill">PRONTO PARA ENVIAR</span></div><div className="card" style={{marginTop:12,background:'#f7f8f5',whiteSpace:'pre-wrap'}}>{invitationText(code)}</div><div className="row" style={{marginTop:12}}><button className="btn primary" onClick={copy}>{copied?'✓ Mensagem copiada':'Copiar mensagem'}</button><button className="btn" onClick={()=>window.open(appLink(),'_blank')}>Abrir aplicativo</button></div></div>}<div className="section-heading" style={{marginTop:20}}><div><span className="eyebrow">HISTÓRICO</span><h3>Convites criados</h3></div></div>{items.map(x=><div className={'card invitation-card '+(x.status==='used'?'invitation-used':'invitation-active')} key={x.id}><div className="row between"><div><b>{x.code}</b><div className="muted small">{x.role} · criado em {new Date(x.created_at).toLocaleDateString('pt-BR')}</div></div><span className="pill">{x.status==='used'?'UTILIZADO':'NÃO UTILIZADO'}</span></div>{x.status==='active'?<div className="row" style={{marginTop:12}}><button className="btn danger" onClick={()=>remove(x)}><Trash2 size={14}/> Excluir convite</button></div>:<div className="muted small" style={{marginTop:10}}>Utilizado em {x.used_at?new Date(x.used_at).toLocaleDateString('pt-BR'):''}. Convites utilizados permanecem no histórico.</div>}</div>)}</div>}function MaintenanceGate(){const[allowed,setAllowed]=useState(null);useEffect(()=>{supabase.auth.getUser().then(({data})=>{setAllowed(String(data?.user?.email||'').toLowerCase()==='wjunior311@gmail.com')})},[]);if(allowed===null)return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f6f3ec',fontFamily:'system-ui,sans-serif'}}><div style={{textAlign:'center',color:'#4b463d'}}>Carregando…</div></div>;if(!allowed)return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'linear-gradient(180deg,#f6f3ec 0%,#ebe6da 100%)',fontFamily:'system-ui,sans-serif'}}><div style={{width:'min(520px,100%)',textAlign:'center',padding:'48px 28px',borderRadius:24,background:'#fffdf8',boxShadow:'0 18px 50px rgba(65,52,35,.12)',border:'1px solid rgba(86,72,49,.12)'}}><div style={{fontSize:42,marginBottom:18}}>🛠️</div><div style={{fontSize:12,fontWeight:800,letterSpacing:2,color:'#7d725f',marginBottom:10}}>TERREIRO PAI BENEDITO DO CONGO</div><h1 style={{margin:'0 0 12px',fontSize:32,color:'#302c26'}}>Em manutenção</h1><p style={{margin:0,fontSize:16,lineHeight:1.6,color:'#655f55'}}>Estamos realizando alguns ajustes no aplicativo. Voltaremos em breve.</p></div></div>;return <App/>}
createRoot(document.getElementById('root')).render(<MaintenanceGate/>)
