document.addEventListener('DOMContentLoaded', async () => {
  GilApp.rewriteLocalLinks();

  const menuButton = document.querySelector('[data-menu-button]');
  const nav = document.querySelector('[data-main-nav]');
  menuButton?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  try {
    const settings = await GilApp.getSettings();
    applyPublicSettings(settings);
    await registerAnonymousMetric(settings);
  } catch (error) {
    console.warn('Configuração dinâmica indisponível:', error.message);
    document.querySelectorAll('[data-supabase-warning]').forEach((element) => {
      element.hidden = false;
      element.textContent = error.message;
    });
  }
});

function applyPublicSettings(settings = {}) {
  const whatsapp = digits(settings.whatsapp || '5561999289239');
  const email = settings.email_contato || 'contato@chefgil.com.br';
  const message = encodeURIComponent('Olá, Chef Gil! Gostaria de conhecer os serviços.');

  document.querySelectorAll('[data-site-whatsapp]').forEach((element) => {
    element.textContent = formatPhone(whatsapp);
  });
  document.querySelectorAll('[data-site-email]').forEach((element) => {
    element.textContent = email;
    if ('href' in element) element.href = `mailto:${email}`;
  });
  document.querySelectorAll('[data-site-hours]').forEach((element) => {
    element.textContent = settings.horario_atendimento || 'Segunda a sábado, das 8h às 20h';
  });
  document.querySelectorAll('[data-instagram]').forEach((element) => {
    element.href = settings.instagram || 'https://www.instagram.com/castrogildesio';
  });
  document.querySelectorAll('[data-whatsapp-link]').forEach((element) => {
    element.href = `https://wa.me/${whatsapp}?text=${message}`;
  });
}

async function registerAnonymousMetric(settings = {}) {
  if (!GilApp.isConfigured() || !settings.analytics_ativo) return;
  const client = await GilApp.getClient();
  await client.rpc('registrar_metrica_publica', {
    p_caminho: location.pathname,
    p_referenciador: document.referrer ? new URL(document.referrer).hostname : null,
    p_dispositivo: matchMedia('(max-width: 720px)').matches ? 'mobile' : 'desktop'
  });
}

function digits(value = '') {
  return String(value).replace(/\D/g, '');
}


function normalizeBrazilianPhone(value = '') {
  const clean = digits(value);
  if (clean.length === 10 || clean.length === 11) return `55${clean}`;
  return clean;
}

function formatPhone(value = '') {
  const clean = digits(value);
  if (clean.length === 13) {
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12) {
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  return value;
}

function escapeHtml(value = '') {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

window.digits = digits;
window.formatPhone = formatPhone;
window.normalizeBrazilianPhone = normalizeBrazilianPhone;
window.escapeHtml = escapeHtml;
window.applyPublicSettings = applyPublicSettings;
