const fallback = {
  servicos: [
    {id:'personal-chef',slug:'personal-chef',nome:'Personal Chef',categoria:'Personal Chef',resumo:'Uma experiência gastronômica criada para você e preparada na sua casa, com menu personalizado, organização cuidadosa e presença discreta do Chef Gil.',imagem_url:GilApp.url('assets/img/personal-chef.svg'),preco_visivel:false,ativo:true},
    {id:'marmitas',slug:'marmitas-e-congelados',nome:'Marmitas e congelados',categoria:'Marmitas',resumo:'Praticidade para todos os dias, com receitas afetivas, ingredientes selecionados e o sabor acolhedor da comida feita com cuidado.',imagem_url:GilApp.url('assets/img/marmitas.svg'),preco_visivel:false,ativo:true},
    {id:'buffet',slug:'buffet-e-eventos',nome:'Buffet e eventos',categoria:'Buffet',resumo:'Apresentação elegante e serviço sob medida para cafés, almoços, aniversários, encontros sociais e eventos corporativos.',imagem_url:GilApp.url('assets/img/buffet.svg'),preco_visivel:false,ativo:true}
  ],
  publicacoes: []
};
async function selectPublic(table, query='*', configure=(q)=>q){
  try{
    const client=await GilApp.getClient();
    const result=await configure(client.from(table).select(query));
    if(result.error) throw result.error;
    return result.data||[];
  }catch(error){
    console.warn(`Fallback ${table}:`,error.message);
    return fallback[table]||[];
  }
}
async function loadServices(target='[data-services-grid]', limit=null){
  const root=document.querySelector(target);
  if(!root) return;
  let items=await selectPublic('servicos','*',q=>q.eq('ativo',true).is('excluido_em',null).order('ordem').limit(limit||50));
  if(!items.length) items=fallback.servicos;
  root.innerHTML=items.map(serviceCard).join('');
}
function serviceCard(s){
  const price=s.preco_visivel&&s.preco_a_partir
    ?`<p class="service-price">A partir de ${Number(s.preco_a_partir).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>`
    :'<p class="service-price">Orçamento personalizado</p>';
  return `<article class="card"><img class="card-media" src="${escapeHtml(s.imagem_url||GilApp.url('assets/img/personal-chef.svg'))}" alt="${escapeHtml(s.nome)}" loading="lazy"><div class="card-body"><span class="eyebrow">${escapeHtml(s.categoria||'Serviço')}</span><h3>${escapeHtml(s.nome)}</h3><p>${escapeHtml(s.resumo||'Experiência personalizada pelo Chef Gil.')}</p>${price}<a class="btn btn-outline" href="${GilApp.url('servico.html')}?slug=${encodeURIComponent(s.slug)}">Conhecer serviço</a></div></article>`;
}
async function loadPosts(target='[data-posts-grid]',limit=6){
  const root=document.querySelector(target);
  if(!root) return;
  const items=await selectPublic('publicacoes','id,titulo,slug,resumo,imagem_url,categoria,publicado_em',q=>q.in('status',['publicada','agendada']).is('excluido_em',null).lte('publicado_em',new Date().toISOString()).order('publicado_em',{ascending:false}).limit(limit));
  root.innerHTML=items.length
    ?items.map(p=>`<article class="card"><img class="card-media" src="${escapeHtml(p.imagem_url||GilApp.url('assets/img/blog.svg'))}" alt="" loading="lazy"><div class="card-body"><span class="eyebrow">${escapeHtml(p.categoria||'Conteúdo')}</span><h3>${escapeHtml(p.titulo)}</h3><p>${escapeHtml(p.resumo||'')}</p><a class="btn btn-outline" href="${GilApp.url('artigo.html')}?slug=${encodeURIComponent(p.slug)}">Ler conteúdo</a></div></article>`).join('')
    :'<div class="empty">Os primeiros conteúdos do Chef Gil serão publicados em breve.</div>';
}
window.fallback=fallback;
window.loadServices=loadServices;
window.loadPosts=loadPosts;
window.selectPublic=selectPublic;

function sanitizeRichHtml(value=''){
 const doc=new DOMParser().parseFromString(`<div>${value}</div>`,'text/html');
 const allowed=new Set(['DIV','P','BR','H2','H3','H4','UL','OL','LI','STRONG','EM','BLOCKQUOTE','A','TABLE','THEAD','TBODY','TR','TH','TD','FIGURE','FIGCAPTION','IMG']);
 doc.body.querySelectorAll('*').forEach(el=>{
  if(!allowed.has(el.tagName)){el.replaceWith(...el.childNodes);return}
  [...el.attributes].forEach(a=>{
   const ok=(el.tagName==='A'&&['href','title'].includes(a.name))||(el.tagName==='IMG'&&['src','alt','loading'].includes(a.name));
   if(!ok)el.removeAttribute(a.name);
  });
  if(el.tagName==='A'){const href=el.getAttribute('href')||'';if(!/^https?:\/\//i.test(href)&&!href.startsWith('/') && !href.startsWith('./') && !href.startsWith('../'))el.removeAttribute('href');el.setAttribute('rel','noopener');}
  if(el.tagName==='IMG'){const src=el.getAttribute('src')||'';if(!/^https?:\/\//i.test(src)&&!src.startsWith('/') && !src.startsWith('./') && !src.startsWith('../'))el.remove();}
 });
 return doc.body.firstElementChild?.innerHTML||'';
}
window.sanitizeRichHtml=sanitizeRichHtml;
