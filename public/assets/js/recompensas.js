function rewardSafe(v=''){return escapeHtml(v)}
async function loadRewards(){
 const c=await GilApp.getClient(),p=window.currentProfile;
 const [{data:rewards,error:rErr},{data:points,error:pErr},{data:redemptions,error:dErr}]=await Promise.all([
  c.from('recompensas').select('*').eq('ativo',true).is('excluido_em',null).order('pontos_necessarios'),
  c.from('pontos_movimentacoes').select('pontos').eq('usuario_id',p.id).is('excluido_em',null),
  c.from('resgates_recompensas').select('*,recompensas(nome)').eq('usuario_id',p.id).is('excluido_em',null).order('criado_em',{ascending:false})
 ]);
 if(rErr||pErr||dErr)throw rErr||pErr||dErr;
 const saldo=(points||[]).reduce((a,x)=>a+Number(x.pontos||0),0);document.querySelector('[data-points-balance]').textContent=saldo;
 const root=document.querySelector('[data-rewards]');
 root.innerHTML=(rewards||[]).map(x=>`<article class="card"><div class="card-body"><span class="eyebrow">${x.pontos_necessarios} pontos</span><h3>${rewardSafe(x.nome)}</h3><p>${rewardSafe(x.descricao||'')}</p>${p.tipo_usuario==='cliente'?`<button class="btn btn-outline" data-redeem="${x.id}" ${saldo<x.pontos_necessarios?'disabled':''}>Solicitar resgate</button>`:''}</div></article>`).join('')||'<div class="empty">Nenhuma recompensa cadastrada.</div>';
 root.querySelectorAll('[data-redeem]').forEach(b=>b.onclick=async()=>{if(!confirm('Solicitar esta recompensa?'))return;const {error}=await c.from('resgates_recompensas').insert({usuario_id:p.id,recompensa_id:b.dataset.redeem,pontos_utilizados:0});if(error)alert(error.message);else{alert('Resgate solicitado.');loadRewards()}});
 document.querySelector('[data-redemptions]').innerHTML=(redemptions||[]).map(x=>`<tr><td>${rewardSafe(x.recompensas?.nome||'Recompensa')}</td><td>${x.pontos_utilizados}</td><td><span class="status ${x.status}">${rewardSafe(x.status)}</span></td><td>${new Date(x.criado_em).toLocaleDateString('pt-BR')}</td></tr>`).join('')||'<tr><td colspan="4">Nenhum resgate.</td></tr>';
 const manager=document.querySelector('[data-reward-manager]');manager.hidden=!['chef','administrador'].includes(p.tipo_usuario);
 if(!manager.hidden){
  const form=manager.querySelector('form');form.onsubmit=async e=>{e.preventDefault();const {error}=await c.from('recompensas').insert({nome:form.nome.value,descricao:form.descricao.value,pontos_necessarios:Number(form.pontos.value),ativo:true});if(error)alert(error.message);else{form.reset();loadRewards()}};
 }
}
document.addEventListener('dashboard-ready',()=>loadRewards().catch(e=>document.querySelector('[data-page-error]').textContent=e.message));
