document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-public-request]').forEach((form) => {
    form.addEventListener('submit', submitPublicRequest);
  });
  document.querySelectorAll('[data-removal-request]').forEach((form) => {
    form.addEventListener('submit', submitRemovalRequest);
  });
  const requestedService = new URLSearchParams(location.search).get('servico');
  if (requestedService) {
    document.querySelectorAll('select[name="servico_interesse"]').forEach((select) => {
      const match = [...select.options].find((option) => option.value === requestedService || option.textContent === requestedService);
      if (match) select.value = match.value;
      else { const option = new Option(requestedService, requestedService, true, true); select.add(option); }
    });
  }
});

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setFormMessage(form, text, type = '') {
  const box = form.querySelector('[data-form-message]');
  if (!box) return;
  box.className = `notice ${type}`.trim();
  box.textContent = text;
  box.hidden = false;
}

async function submitPublicRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;

  try {
    const raw = formObject(form);
    const known = new Set(['nome', 'email', 'whatsapp', 'servico_interesse', 'data_desejada', 'quantidade_convidados', 'mensagem']);
    const extras = Object.fromEntries(Object.entries(raw).filter(([key]) => !known.has(key)));
    const client = await GilApp.getClient();
    const { data, error } = await client.rpc('registrar_solicitacao_publica', {
      p_tipo: form.dataset.publicRequest,
      p_nome: raw.nome,
      p_email: raw.email || null,
      p_whatsapp: normalizeBrazilianPhone(raw.whatsapp),
      p_servico_interesse: raw.servico_interesse || null,
      p_data_desejada: raw.data_desejada || null,
      p_quantidade_convidados: raw.quantidade_convidados ? Number(raw.quantidade_convidados) : null,
      p_mensagem: raw.mensagem || null,
      p_dados_adicionais: extras,
      p_origem: location.pathname
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    const settings = await GilApp.getSettings();
    const whatsapp = digits(settings.whatsapp || '5561999289239');
    const text = encodeURIComponent(
      `Olá, Chef Gil! Registrei uma solicitação no site.\nProtocolo: ${result.protocolo}\nNome: ${raw.nome}\nTipo: ${form.dataset.publicRequest}`
    );

    setFormMessage(form, `Solicitação registrada. Protocolo: ${result.protocolo}`, 'success');
    form.reset();
    window.open(`https://wa.me/${whatsapp}?text=${text}`, '_blank', 'noopener');
  } catch (error) {
    setFormMessage(form, error.message || 'Não foi possível registrar a solicitação.', 'error');
  } finally {
    button.disabled = false;
  }
}

async function submitRemovalRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;

  try {
    const raw = formObject(form);
    const client = await GilApp.getClient();
    const { data, error } = await client.rpc('registrar_solicitacao_remocao', {
      p_tipo: raw.tipo,
      p_nome: raw.nome,
      p_email: raw.email,
      p_whatsapp: raw.whatsapp ? normalizeBrazilianPhone(raw.whatsapp) : null,
      p_url_conteudo: raw.url_conteudo || null,
      p_motivo: raw.motivo
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    setFormMessage(
      form,
      `Pedido registrado sob o protocolo ${result.protocolo}. A identidade será confirmada antes do processamento.`,
      'success'
    );
    form.reset();
  } catch (error) {
    setFormMessage(form, error.message || 'Não foi possível registrar a solicitação.', 'error');
  } finally {
    button.disabled = false;
  }
}
