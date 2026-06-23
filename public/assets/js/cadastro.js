(() => {
  const state = { convite: null, conviteValido: true };

  function setMessage(form, text, type = '') {
    const message = form.querySelector('.form-message');
    message.textContent = text;
    message.className = `form-message ${type}`.trim();
  }

  function setBirthRequired(form, required) {
    const section = form.querySelector('[data-birth-section]');
    section.hidden = !required;
    section.querySelectorAll('select').forEach((select) => {
      select.required = required;
      if (!required) select.value = '';
    });
  }

  function parseBirth(form) {
    const year = Number(form.ano.value);
    const month = Number(form.mes.value);
    const day = Number(form.dia.value);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    if (
      !year || !month || !day ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new Error('Informe uma data de nascimento válida.');
    }
    const limit = new Date();
    limit.setHours(23, 59, 59, 999);
    limit.setFullYear(limit.getFullYear() - 18);
    if (date > limit) throw new Error('É necessário ter 18 anos ou mais.');
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  async function loadInvite(form) {
    const token = new URLSearchParams(location.search).get('convite');
    if (!token) {
      setBirthRequired(form, true);
      return;
    }

    try {
      const client = await GilApp.getClient();
      const { data, error } = await client.rpc('consultar_convite_publico', { p_token: token });
      if (error) throw error;
      const invite = Array.isArray(data) ? data[0] : data;
      if (!invite?.valido) throw new Error(invite?.mensagem || 'Convite inválido ou expirado.');

      state.convite = { ...invite, token };
      form.nome.value = invite.nome || '';
      form.nome_exibicao.value = invite.nome || '';
      form.email.value = invite.email || '';
      form.email.readOnly = true;
      form.whatsapp.value = invite.whatsapp || '';
      setBirthRequired(form, invite.tipo_usuario === 'cliente');

      document.querySelector('[data-register-eyebrow]').textContent = 'Convite de acesso';
      document.querySelector('[data-register-title]').textContent = `Criar acesso de ${invite.tipo_usuario}`;
      const context = document.querySelector('[data-account-context]');
      context.hidden = false;
      context.textContent = `Este convite é destinado ao perfil ${invite.tipo_usuario} e expira em ${new Date(invite.expira_em).toLocaleDateString('pt-BR')}.`;
    } catch (error) {
      state.conviteValido = false;
      form.querySelector('button[type="submit"]').disabled = true;
      setMessage(form, error.message || 'Não foi possível validar o convite.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('#cadastro-form');
    if (!form) return;

    await loadInvite(form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      try {
        if (!state.conviteValido) throw new Error('Este convite não pode ser utilizado.');
        if (form.senha.value !== form.confirmar.value) throw new Error('As senhas não coincidem.');
        const isClient = !state.convite || state.convite.tipo_usuario === 'cliente';
        const birth = isClient ? parseBirth(form) : null;

        button.disabled = true;
        setMessage(form, 'Criando cadastro…');
        await GilAuth.signUp({
          nome: form.nome.value.trim(),
          nome_exibicao: form.nome_exibicao.value.trim(),
          email: form.email.value.trim(),
          whatsapp: form.whatsapp.value,
          cidade: form.cidade.value.trim(),
          data_nascimento: birth,
          senha: form.senha.value,
          convite_token: state.convite?.token || null
        });
        setMessage(form, 'Cadastro criado. Verifique seu e-mail para confirmar a conta e depois entre.', 'success');
        form.reset();
      } catch (error) {
        setMessage(form, error.message || 'Não foi possível criar o cadastro.', 'error');
      } finally {
        if (state.conviteValido) button.disabled = false;
      }
    });
  });
})();
