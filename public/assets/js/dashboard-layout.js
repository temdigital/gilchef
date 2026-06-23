const MENUS = {
  administrador: [
    ['Visão geral','dashboard/index.html','⌂'],['Agenda','dashboard/agenda.html','◫'],['Compromissos internos','dashboard/bloqueios.html','◒'],['Disponibilidade','dashboard/disponibilidade-admin.html','◐'],['Solicitações','dashboard/solicitacoes.html','✦'],
    ['Reservas','dashboard/reservas.html','◷'],['Pedidos','dashboard/pedidos.html','▣'],['Clientes','dashboard/clientes.html','◎'],['Usuários','dashboard/usuarios.html','♙'],['Convites','dashboard/convites.html','✉'],
    ['Serviços','dashboard/servicos.html','◇'],['Cardápios','dashboard/cardapios.html','☰'],['Eventos públicos','dashboard/eventos.html','◉'],['Publicações','dashboard/publicacoes.html','✎'],['Promoções','dashboard/promocoes.html','％'],['Parceiros','dashboard/parceiros.html','♢'],['Vídeos','dashboard/videos.html','▷'],
    ['Aniversariantes','dashboard/aniversariantes.html','✺'],['Pontos e ranking','dashboard/ranking.html','★'],['Recompensas','dashboard/recompensas.html','◆'],['Financeiro','dashboard/financeiro.html','₿'],['Analytics','dashboard/analytics.html','↗'],['Saúde do sistema','dashboard/saude.html','♡'],['Remoções','dashboard/remocoes.html','⌫'],['Mensagens','dashboard/mensagens.html','✉'],['Logs','dashboard/logs.html','≡'],['Configurações','dashboard/configuracoes.html','⚙'],['Perfil','dashboard/perfil.html','●']
  ],
  chef: [
    ['Visão geral','dashboard/index.html','⌂'],['Agenda','dashboard/agenda.html','◫'],['Compromissos internos','dashboard/bloqueios.html','◒'],['Disponibilidade','dashboard/disponibilidade-admin.html','◐'],['Solicitações','dashboard/solicitacoes.html','✦'],['Reservas','dashboard/reservas.html','◷'],['Pedidos','dashboard/pedidos.html','▣'],['Clientes','dashboard/clientes.html','◎'],['Convites','dashboard/convites.html','✉'],['Serviços','dashboard/servicos.html','◇'],['Cardápios','dashboard/cardapios.html','☰'],['Eventos públicos','dashboard/eventos.html','◉'],['Publicações','dashboard/publicacoes.html','✎'],['Promoções','dashboard/promocoes.html','％'],['Parceiros','dashboard/parceiros.html','♢'],['Vídeos','dashboard/videos.html','▷'],['Aniversariantes','dashboard/aniversariantes.html','✺'],['Pontos e ranking','dashboard/ranking.html','★'],['Recompensas','dashboard/recompensas.html','◆'],['Financeiro','dashboard/financeiro.html','₿'],['Mensagens','dashboard/mensagens.html','✉'],['Perfil','dashboard/perfil.html','●']
  ],
  assistente: [
    ['Visão geral','dashboard/index.html','⌂'],['Agenda','dashboard/agenda.html','◫'],['Compromissos internos','dashboard/bloqueios.html','◒'],['Solicitações','dashboard/solicitacoes.html','✦'],['Reservas','dashboard/reservas.html','◷'],['Pedidos','dashboard/pedidos.html','▣'],['Clientes','dashboard/clientes.html','◎'],['Aniversariantes','dashboard/aniversariantes.html','✺'],['Perfil','dashboard/perfil.html','●']
  ],
  cliente: [
    ['Visão geral','dashboard/index.html','⌂'],['Meus pedidos','dashboard/pedidos.html','▣'],['Minhas reservas','dashboard/reservas.html','◷'],['Favoritos','dashboard/favoritos.html','♡'],['Avaliações','dashboard/avaliacoes.html','☆'],['Meus pontos','dashboard/ranking.html','★'],['Recompensas','dashboard/recompensas.html','◆'],['Perfil','dashboard/perfil.html','●']
  ]
};

const ACCESS = {
  usuarios:['administrador'], remocoes:['administrador'], logs:['administrador'], configuracoes:['administrador'], analytics:['administrador'], saude:['administrador'],
  mensagens:['administrador','chef'], convites:['administrador','chef'], servicos:['administrador','chef'], cardapios:['administrador','chef'], eventos:['administrador','chef'], publicacoes:['administrador','chef'], promocoes:['administrador','chef'], parceiros:['administrador','chef'], videos:['administrador','chef'], financeiro:['administrador','chef'], disponibilidade:['administrador','chef'],
  bloqueios:['administrador','chef','assistente'], solicitacoes:['administrador','chef','assistente'], agenda:['administrador','chef','assistente'], clientes:['administrador','chef','assistente'], aniversariantes:['administrador','chef','assistente'], favoritos:['cliente'], avaliacoes:['cliente']
};

function pageKey() {
  return location.pathname.split('/').filter(Boolean).pop()?.replace('.html','') || 'index';
}

function allowed(profile) {
  const key = pageKey().replace('-admin','');
  if (['index','perfil','pedidos','reservas','ranking','recompensas'].includes(key)) return true;
  return !ACCESS[key] || ACCESS[key].includes(profile.tipo_usuario);
}

function activePath(route) {
  return location.pathname.endsWith(route.replace(/^dashboard\//,''));
}

async function initDashboard() {
  const profile = await GilAuth.requireAuth();
  if (!allowed(profile)) {
    location.href = GilApp.url('dashboard/index.html');
    return;
  }

  document.documentElement.dataset.role = profile.tipo_usuario;
  document.querySelectorAll('[data-profile-name]').forEach((element) => {
    element.textContent = profile.nome_exibicao || profile.nome;
  });
  document.querySelectorAll('[data-profile-role]').forEach((element) => {
    element.textContent = profile.tipo_usuario;
  });

  const nav = document.querySelector('[data-dashboard-nav]');
  if (nav) {
    nav.innerHTML = (MENUS[profile.tipo_usuario] || MENUS.cliente).map(([name, route, icon]) =>
      `<a href="${GilApp.url(route)}" class="${activePath(route) ? 'active' : ''}"><span aria-hidden="true">${icon}</span><span>${name}</span></a>`
    ).join('');
  }

  document.querySelectorAll('[data-logout]').forEach((button) => button.addEventListener('click', GilAuth.logout));
  const sidebar = document.querySelector('.dashboard-sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const toggle = () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('open');
  };
  document.querySelector('[data-sidebar-toggle]')?.addEventListener('click', toggle);
  overlay?.addEventListener('click', toggle);

  window.currentProfile = profile;
  document.dispatchEvent(new CustomEvent('dashboard-ready', { detail: profile }));
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard().catch((error) => {
    console.error(error);
    document.body.innerHTML = `<main class="container section"><h1>Acesso indisponível</h1><p>${escapeHtml(error.message)}</p><a href="${GilApp.url('login.html')}" class="btn btn-primary">Entrar novamente</a></main>`;
  });
});
