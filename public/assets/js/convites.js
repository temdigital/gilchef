async function abrirConviteNoWhatsApp(invite) {
  const url = new URL(GilApp.url(`cadastro.html?convite=${encodeURIComponent(invite.token)}`), location.origin).href;
  const text = encodeURIComponent(`Olá, ${invite.nome}! Você recebeu um convite para acessar o Gil Personal Chef. O convite expira em 30 dias: ${url}`);
  window.open(`https://wa.me/${normalizeBrazilianPhone(invite.whatsapp)}?text=${text}`, '_blank', 'noopener');
}

async function carregarConvites() {
  const client = await GilApp.getClient();
  const { data, error } = await client.from('convites').select('*').is('excluido_em', null).order('criado_em', { ascending: false }).limit(100);
  if (error) throw error;

  const body = document.querySelector('[data-invites]');
  const actions = (invite) => {
    if (invite.status === 'pendente') {
      return `<div class="table-actions"><button class="icon-btn" data-send="${invite.id}">Enviar</button><button class="icon-btn" data-cancel="${invite.id}">Cancelar</button></div>`;
    }
    if (['cancelado', 'expirado'].includes(invite.status)) {
      return `<button class="icon-btn" data-reactivate="${invite.id}">Reativar</button>`;
    }
    return '—';
  };

  body.innerHTML = (data || []).map((invite) => `<tr><td>${escapeHtml(invite.nome)}</td><td>${escapeHtml(invite.email)}</td><td>${escapeHtml(invite.tipo_usuario)}</td><td><span class="status ${invite.status}">${escapeHtml(invite.status)}</span></td><td>${new Date(invite.expira_em).toLocaleDateString('pt-BR')}</td><td>${actions(invite)}</td></tr>`).join('') || '<tr><td colspan="6">Nenhum convite.</td></tr>';

  body.querySelectorAll('[data-send]').forEach((button) => {
    button.onclick = () => abrirConviteNoWhatsApp(data.find((item) => item.id === button.dataset.send));
  });

  body.querySelectorAll('[data-cancel]').forEach((button) => {
    button.onclick = async () => {
      if (!confirm('Cancelar este convite?')) return;
      const { error: updateError } = await client.from('convites').update({ status: 'cancelado' }).eq('id', button.dataset.cancel);
      if (updateError) alert(updateError.message); else carregarConvites();
    };
  });

  body.querySelectorAll('[data-reactivate]').forEach((button) => {
    button.onclick = async () => {
      const id = button.dataset.reactivate;
      const { data: invite, error: updateError } = await client.from('convites').update({
        status: 'pendente',
        token: null,
        expira_em: null
      }).eq('id', id).select('*').single();
      if (updateError) return alert(updateError.message);
      await carregarConvites();
      abrirConviteNoWhatsApp(invite);
    };
  });
}

document.addEventListener('dashboard-ready', () => {
  const form = document.querySelector('#invite-form');
  if (window.currentProfile.tipo_usuario === 'chef') {
    form.tipo_usuario.querySelector('option[value="administrador"]')?.remove();
    form.tipo_usuario.querySelector('option[value="chef"]')?.remove();
  }

  carregarConvites().catch((error) => { document.querySelector('[data-page-error]').textContent = error.message; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = form.querySelector('.form-message');
    const button = form.querySelector('button');
    try {
      button.disabled = true;
      const client = await GilApp.getClient();
      const { data, error } = await client.from('convites').insert({
        nome: form.nome.value.trim(),
        email: form.email.value.toLowerCase().trim(),
        whatsapp: normalizeBrazilianPhone(form.whatsapp.value),
        tipo_usuario: form.tipo_usuario.value,
        criado_por: window.currentProfile.id
      }).select('*').single();
      if (error) throw error;
      abrirConviteNoWhatsApp(data);
      message.textContent = 'Convite criado e WhatsApp aberto.';
      form.reset();
      await carregarConvites();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
});
