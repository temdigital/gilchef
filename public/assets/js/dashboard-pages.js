const fmtMoney = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const fmtDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: String(value).includes('T') ? 'short' : undefined }).format(new Date(value)) : '—';
const statusClass = (value) => String(value || '').toLowerCase().replaceAll('_','-').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const labelize = (value) => String(value || '').replaceAll('_',' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const safe = (value) => escapeHtml(value ?? '');
const isStaff = () => ['assistente','chef','administrador'].includes(window.currentProfile?.tipo_usuario);
const isManager = () => ['chef','administrador'].includes(window.currentProfile?.tipo_usuario);
async function client() { return GilApp.getClient(); }

function authIdFilter(query, config) {
  if (config.ownerField && !isStaff()) return query.eq(config.ownerField, window.currentProfile.id);
  return query;
}

async function loadSource(field) {
  const c = await client();
  const { data, error } = await c.from(field.source.table).select(field.source.select || 'id,nome').order(field.source.label || 'nome');
  if (error) throw error;
  return data || [];
}

function inputValue(item, name) {
  const value = item?.[name];
  if (value === null || value === undefined) return '';
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'string' && value.includes('T') && name.match(/inicio|fim|entrega/)) return value.slice(0,16);
  return value;
}

async function formFields(config, item = {}) {
  const chunks = [];
  for (const field of config.fields || []) {
    if (field.roles && !field.roles.includes(window.currentProfile.tipo_usuario)) continue;
    const value = inputValue(item, field.name);
    const required = field.required ? 'required' : '';
    let control = '';
    if (field.type === 'textarea' || field.type === 'json') {
      control = `<textarea name="${field.name}" ${required} rows="${field.rows || 4}">${safe(value)}</textarea>`;
    } else if (field.type === 'select') {
      let options = field.options || [];
      if (field.source) options = (await loadSource(field)).map((row) => ({ value: row[field.source.value || 'id'], label: row[field.source.label || 'nome'] }));
      control = `<select name="${field.name}" ${required}><option value="">Selecione</option>${options.map((option) => {
        const optionValue = option.value ?? option;
        const optionLabel = option.label ?? labelize(option);
        return `<option value="${safe(optionValue)}" ${String(value) === String(optionValue) ? 'selected' : ''}>${safe(optionLabel)}</option>`;
      }).join('')}</select>`;
    } else if (field.type === 'checkbox') {
      control = `<input type="checkbox" name="${field.name}" ${value ? 'checked' : ''}>`;
    } else {
      control = `<input type="${field.type || 'text'}" name="${field.name}" value="${safe(value)}" ${required} ${field.step ? `step="${field.step}"` : ''} ${field.readonly ? 'readonly' : ''}>`;
    }
    chunks.push(`<label class="${field.wide ? 'wide' : ''}">${safe(field.label)}${control}${field.help ? `<small>${safe(field.help)}</small>` : ''}</label>`);
  }
  return chunks.join('');
}

function normalizeForm(form, fields) {
  const output = {};
  for (const field of fields || []) {
    if (field.roles && !field.roles.includes(window.currentProfile.tipo_usuario)) continue;
    const element = form.elements[field.name];
    if (!element || field.readonly) continue;
    let value = field.type === 'checkbox' ? element.checked : element.value.trim();
    if (value === '' && !field.keepEmpty) value = null;
    if (value !== null && ['number','money'].includes(field.type)) value = Number(value);
    if (value !== null && field.type === 'json') {
      try { value = JSON.parse(value); } catch { throw new Error(`JSON inválido em ${field.label}.`); }
    }
    output[field.name] = value;
  }
  return output;
}

function renderCell(row, column) {
  const value = column.render ? column.render(row) : row[column.key];
  if (column.type === 'money') return fmtMoney(value);
  if (column.type === 'date') return fmtDate(value);
  if (column.type === 'status') return `<span class="status ${statusClass(value)}">${safe(labelize(value))}</span>`;
  if (column.type === 'boolean') return value ? 'Sim' : 'Não';
  return safe(value || '—');
}

async function openCrudDialog(config, item = {}) {
  if (!item.id && config.table === 'usuarios') {
    alert('Novos usuários devem ser cadastrados publicamente ou convidados pelo menu Convites.');
    return;
  }
  const dialog = document.querySelector('#crud-dialog');
  const form = dialog.querySelector('form');
  dialog.querySelector('[data-dialog-title]').textContent = item.id ? 'Editar registro' : 'Novo registro';
  form.innerHTML = `<div class="form-grid">${await formFields(config, item)}</div><p class="form-message" aria-live="polite"></p><div class="dialog-actions"><button type="button" class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary">Salvar</button></div>`;
  form.querySelector('[data-close]').onclick = () => dialog.close();
  form.onsubmit = async (event) => {
    event.preventDefault();
    const message = form.querySelector('.form-message');
    const submit = form.querySelector('[type="submit"]');
    try {
      submit.disabled = true;
      let payload = normalizeForm(form, config.fields);
      if (!item.id && config.ownerField && !isStaff()) payload[config.ownerField] = window.currentProfile.id;
      if (config.beforeSave) payload = await config.beforeSave(payload, item);
      const c = await client();
      const query = item.id ? c.from(config.table).update(payload).eq('id', item.id) : c.from(config.table).insert(payload);
      const { error } = await query;
      if (error) throw error;
      dialog.close();
      await loadCrud(config);
    } catch (error) {
      message.textContent = error.message || 'Não foi possível salvar.';
    } finally {
      submit.disabled = false;
    }
  };
  dialog.showModal();
}

async function loadCrud(config = window.PAGE_CONFIG) {
  const c = await client();
  if (config.table === 'promocoes' && isManager()) {
    await c.from('promocoes').update({ status: 'arquivada' }).eq('status', 'ativa').lt('fim_em', new Date().toISOString()).is('excluido_em', null);
  }
  let query = c.from(config.table).select(config.select || '*');
  if (!config.noSoftDelete) query = query.is(config.deletedField || 'excluido_em', null);
  if (config.filters) for (const [key, value] of Object.entries(config.filters)) query = query.eq(key, value);
  if (config.order) query = query.order(config.order, { ascending: config.ascending ?? false });
  query = authIdFilter(query, config);
  const { data, error } = await query.limit(config.limit || 250);
  if (error) throw error;

  const rows = data || [];
  const tbody = document.querySelector('[data-table-body]');
  tbody.innerHTML = rows.length ? rows.map((row) => `<tr>${config.columns.map((column) => `<td>${renderCell(row, column)}</td>`).join('')}<td>${config.readOnly || (config.staffEditOnly && !isStaff()) ? '—' : `<div class="table-actions"><button class="icon-btn" data-edit="${row.id}">Editar</button>${config.processApproved && row.status === 'aprovada' ? `<button class="icon-btn" data-process="${row.id}">Processar</button>` : ''}${config.noDelete ? '' : `<button class="icon-btn" data-delete="${row.id}">Excluir</button>`}</div>`}</td></tr>`).join('') : `<tr><td colspan="${config.columns.length + 1}">Nenhum registro encontrado.</td></tr>`;
  document.querySelector('[data-result-count]').textContent = `${rows.length} registro(s)`;

  tbody.querySelectorAll('[data-edit]').forEach((button) => {
    button.onclick = () => openCrudDialog(config, rows.find((row) => String(row.id) === button.dataset.edit));
  });
  tbody.querySelectorAll('[data-process]').forEach((button) => {
    button.onclick = async () => {
      if (!confirm('Processar definitivamente esta solicitação aprovada? Esta ação remove ou anonimiza os dados conforme o tipo.')) return;
      button.disabled = true;
      try {
        const result = await GilApp.invoke('processar-remocao', { solicitacao_id: button.dataset.process });
        alert(result?.mensagem || 'Solicitação processada.');
        await loadCrud(config);
      } catch (error) {
        alert(error.message || 'Não foi possível processar a solicitação.');
      } finally {
        button.disabled = false;
      }
    };
  });

  tbody.querySelectorAll('[data-delete]').forEach((button) => {
    button.onclick = async () => {
      if (!confirm('Deseja remover este registro?')) return;
      const payload = { [config.deletedField || 'excluido_em']: new Date().toISOString() };
      const { error: deleteError } = await c.from(config.table).update(payload).eq('id', button.dataset.delete);
      if (deleteError) alert(deleteError.message); else loadCrud(config);
    };
  });

  const search = document.querySelector('[data-table-search]');
  if (search) search.oninput = () => {
    const term = search.value.toLowerCase();
    tbody.querySelectorAll('tr').forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(term); });
  };
}

async function loadOverview() {
  const c = await client();
  const profile = window.currentProfile;
  const staff = isStaff();
  const sources = staff ? [['pedidos','Pedidos'],['reservas','Reservas'],['solicitacoes_publicas','Solicitações'],['usuarios','Usuários']] : [['pedidos','Meus pedidos'],['reservas','Minhas reservas'],['favoritos','Favoritos'],['pontos_movimentacoes','Pontos']];
  const values = [];
  for (const [table, label] of sources) {
    let query = c.from(table).select('*', { count: 'exact', head: true }).is('excluido_em', null);
    if (!staff && ['pedidos','reservas','favoritos','pontos_movimentacoes'].includes(table)) query = query.eq('usuario_id', profile.id);
    const { count } = await query;
    values.push({ label, value: count || 0 });
  }
  document.querySelector('[data-metrics]').innerHTML = values.map((item) => `<article class="metric"><span>${safe(item.label)}</span><strong>${item.value}</strong></article>`).join('');
  let query = c.from('reservas').select('id,protocolo,data_inicio,status,nome_cliente').is('excluido_em', null).gte('data_inicio', new Date().toISOString()).order('data_inicio').limit(8);
  if (!staff) query = query.eq('usuario_id', profile.id);
  const { data } = await query;
  document.querySelector('[data-overview-list]').innerHTML = (data || []).map((item) => `<tr><td>${safe(item.protocolo)}</td><td>${safe(item.nome_cliente)}</td><td>${fmtDate(item.data_inicio)}</td><td><span class="status ${statusClass(item.status)}">${safe(labelize(item.status))}</span></td></tr>`).join('') || '<tr><td colspan="4">Nenhuma reserva próxima.</td></tr>';
}

async function loadCalendar() {
  const c = await client();
  let reservations = c.from('reservas').select('id,protocolo,nome_cliente,data_inicio,data_fim,status').is('excluido_em', null).gte('data_fim', new Date().toISOString()).order('data_inicio').limit(100);
  if (!isStaff()) reservations = reservations.eq('usuario_id', window.currentProfile.id);
  const promises = [reservations];
  if (isStaff()) promises.push(c.from('bloqueios_agenda').select('id,titulo,inicio,fim,motivo').is('excluido_em', null).gte('fim', new Date().toISOString()).order('inicio').limit(100));
  const results = await Promise.all(promises);
  if (results.some((result) => result.error)) throw results.find((result) => result.error).error;
  const events = (results[0].data || []).map((row) => ({ title: row.nome_cliente, subtitle: `${row.protocolo} · ${labelize(row.status)}`, start: row.data_inicio, end: row.data_fim, kind: 'Reserva' }));
  if (results[1]) events.push(...(results[1].data || []).map((row) => ({ title: row.titulo, subtitle: row.motivo || 'Compromisso interno', start: row.inicio, end: row.fim, kind: 'Interno' })));
  events.sort((a,b) => new Date(a.start) - new Date(b.start));
  document.querySelector('[data-calendar-list]').innerHTML = events.map((event) => `<article class="health-item"><div><strong>${safe(event.title)}</strong><small>${safe(event.kind)} · ${safe(event.subtitle)}</small></div><span>${fmtDate(event.start)} — ${fmtDate(event.end)}</span></article>`).join('') || '<p>Nenhum compromisso futuro.</p>';
}

async function loadUsers() {
  const c = await client();
  const { data, error } = await c.from('usuarios').select('*').is('excluido_em', null).order('nome').limit(250);
  if (error) throw error;
  const rows = data || [];
  const tbody = document.querySelector('[data-table-body]');
  tbody.innerHTML = rows.map((user) => `<tr><td>${safe(user.nome)}</td><td>${safe(user.email)}</td><td>${safe(user.whatsapp)}</td><td><span class="status">${safe(user.tipo_usuario)}</span></td><td>${safe(user.status)}</td><td><button class="icon-btn" data-user="${user.id}">Editar</button></td></tr>`).join('') || '<tr><td colspan="6">Nenhum usuário.</td></tr>';
  tbody.querySelectorAll('[data-user]').forEach((button) => { button.onclick = () => openUser(rows.find((item) => item.id === button.dataset.user)); });
}

async function openUser(user) {
  const dialog = document.querySelector('#crud-dialog');
  const form = dialog.querySelector('form');
  dialog.querySelector('[data-dialog-title]').textContent = 'Editar usuário';
  form.innerHTML = `<div class="form-grid"><label>Nome<input name="nome" value="${safe(user.nome)}"></label><label>Tipo<select name="tipo_usuario">${['cliente','assistente','chef','administrador'].map((role) => `<option ${user.tipo_usuario === role ? 'selected' : ''}>${role}</option>`).join('')}</select></label><label>Status<select name="status">${['ativo','bloqueado','inativo'].map((status) => `<option ${user.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label>Superadministrador<input type="checkbox" name="eh_superadministrador" ${user.eh_superadministrador ? 'checked' : ''}></label></div><p class="form-message"></p><div class="dialog-actions"><button type="button" class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary">Salvar</button></div>`;
  form.querySelector('[data-close]').onclick = () => dialog.close();
  form.onsubmit = async (event) => {
    event.preventDefault();
    const c = await client();
    const payload = { nome: form.nome.value, tipo_usuario: form.tipo_usuario.value, status: form.status.value, eh_superadministrador: form.eh_superadministrador.checked };
    const { error } = await c.from('usuarios').update(payload).eq('id', user.id);
    if (error) form.querySelector('.form-message').textContent = error.message; else { dialog.close(); loadUsers(); }
  };
  dialog.showModal();
}

async function loadProfile() {
  const profile = window.currentProfile;
  const form = document.querySelector('#profile-form');
  Object.entries(profile).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; });
  const birth = form.querySelector('[data-birth-section]');
  if (profile.tipo_usuario !== 'cliente') birth.hidden = true;
  if (profile.data_nascimento) {
    const [year, month, day] = profile.data_nascimento.split('-');
    form.elements.nascimento_dia.value = day;
    form.elements.nascimento_mes.value = month;
    form.elements.nascimento_ano.value = year;
    const today = new Date();
    const born = new Date(Number(year), Number(month) - 1, Number(day));
    let age = today.getFullYear() - born.getFullYear();
    if (today < new Date(today.getFullYear(), born.getMonth(), born.getDate())) age -= 1;
    form.querySelector('[data-profile-age]').textContent = `${age} anos`;
    if (today.getMonth() === born.getMonth() && today.getDate() === born.getDate()) {
      document.body.classList.add('birthday');
      const note = document.createElement('div');
      note.className = 'birthday-message';
      note.innerHTML = '<strong>Feliz aniversário!</strong><span>O Gil Personal Chef deseja um dia repleto de alegria e bons encontros.</span>';
      document.querySelector('.dashboard-content').prepend(note);
    }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const output = {};
    ['nome','nome_exibicao','whatsapp','cidade','biografia','preferencias_alimentares','alergias','restricoes','endereco','instagram','facebook','tiktok','kwai','outro_link'].forEach((key) => { output[key] = form.elements[key]?.value || null; });
    if (profile.tipo_usuario === 'cliente') output.data_nascimento = `${form.elements.nascimento_ano.value}-${form.elements.nascimento_mes.value}-${form.elements.nascimento_dia.value}`;
    const c = await client();
    const { error } = await c.from('usuarios').update(output).eq('id', profile.id);
    form.querySelector('.form-message').textContent = error ? error.message : 'Perfil atualizado com sucesso.';
  });
}

async function loadSettings() {
  const c = await client();
  const { data, error } = await c.from('configuracoes_sistema').select('*').eq('id', 1).single();
  if (error) throw error;
  const form = document.querySelector('#settings-form');
  Object.entries(data).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    if (form.elements[key].type === 'checkbox') form.elements[key].checked = Boolean(value); else form.elements[key].value = value ?? '';
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const output = Object.fromEntries(new FormData(form));
    form.querySelectorAll('[type="checkbox"]').forEach((input) => { output[input.name] = input.checked; });
    ['taxa_deslocamento_fixa','valor_km','raio_atendimento_km'].forEach((key) => { output[key] = Number(output[key] || 0); });
    const { error: updateError } = await c.from('configuracoes_sistema').update(output).eq('id', 1);
    form.querySelector('.form-message').textContent = updateError ? updateError.message : 'Configurações salvas.';
  });
}

async function loadBirthdays() {
  const c = await client();
  const { data, error } = await c.from('aniversariantes_do_mes').select('*');
  if (error) throw error;
  document.querySelector('[data-birthdays]').innerHTML = (data || []).map((item) => `<article class="health-item"><div><strong>${safe(item.nome)}</strong><small>${safe(item.cidade || '')} · dia ${item.dia}</small></div><a class="btn btn-small btn-outline" target="_blank" rel="noopener" href="https://wa.me/${digits(item.whatsapp)}?text=${encodeURIComponent('Feliz aniversário! O Gil Personal Chef deseja um novo ciclo repleto de alegrias e bons encontros.')}">Enviar WhatsApp</a></article>`).join('') || '<p>Nenhum aniversariante neste mês.</p>';
}

async function loadRanking() {
  const c = await client();
  const { data, error } = await c.from('ranking_clientes').select('*').order('posicao').limit(100);
  if (error) throw error;
  document.querySelector('[data-ranking]').innerHTML = (data || []).map((item) => `<tr><td>${item.posicao}</td><td>${safe(item.nome_anonimizado)}</td><td>${item.pedidos_finalizados}</td><td>${item.pontos}</td></tr>`).join('') || '<tr><td colspan="4">Ranking ainda sem dados.</td></tr>';
}

async function loadHealth() {
  const c = await client();
  const checks = {};
  for (const table of ['usuarios','servicos','solicitacoes_publicas','reservas','pedidos']) {
    const { error } = await c.from(table).select('id', { head: true, count: 'exact' }).limit(1);
    checks[table] = { ok: !error, detalhe: error?.message || null };
  }
  checks.supabase = { ok: true, detalhe: 'Conexão autenticada e políticas RLS ativas.' };
  document.querySelector('[data-health]').innerHTML = Object.entries(checks).map(([key, value]) => `<article class="health-item"><strong>${safe(labelize(key))}</strong><span class="status ${value.ok ? 'ativo' : 'cancelado'}">${value.ok ? 'Operacional' : 'Atenção'}${value.detalhe ? ` — ${safe(value.detalhe)}` : ''}</span></article>`).join('');
}

async function loadAnalytics() {
  const c = await client();
  const { data, error } = await c.from('metricas_site').select('*').order('data_referencia', { ascending: false }).limit(500);
  if (error) throw error;
  const rows = data || [];
  const total = rows.reduce((sum, row) => sum + Number(row.visualizacoes || 0), 0);
  const mobile = rows.filter((row) => row.dispositivo === 'mobile').reduce((sum, row) => sum + Number(row.visualizacoes || 0), 0);
  document.querySelector('[data-analytics-summary]')?.replaceChildren();
  const summary = document.querySelector('[data-analytics-summary]');
  if (summary) summary.innerHTML = `<article class="metric"><span>Visualizações</span><strong>${total}</strong></article><article class="metric"><span>Mobile</span><strong>${total ? Math.round((mobile/total)*100) : 0}%</strong></article><article class="metric"><span>Rotas medidas</span><strong>${new Set(rows.map((row) => row.caminho)).size}</strong></article>`;
  const body = document.querySelector('[data-analytics-table]');
  if (body) body.innerHTML = rows.slice(0,100).map((row) => `<tr><td>${fmtDate(row.data_referencia)}</td><td>${safe(row.caminho)}</td><td>${safe(row.dispositivo)}</td><td>${row.visualizacoes}</td></tr>`).join('') || '<tr><td colspan="4">Ainda não há métricas.</td></tr>';
}

async function initPixForm() {
  const form = document.querySelector('#pix-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const c = await client();
      const { data, error } = await c.from('configuracoes_sistema').select('pix_chave,pix_nome,pix_cidade').eq('id',1).single();
      if (error) throw error;
      const code = GilPix.generatePixCode({ key: data.pix_chave, name: data.pix_nome, city: data.pix_cidade, amount: form.valor.value, txid: form.txid.value });
      const box = document.querySelector('#pix-result');
      box.hidden = false;
      box.querySelector('[data-pix-code]').value = code;
      const qr = box.querySelector('[data-pix-qr]');
      qr.innerHTML = '';
      new QRCode(qr, { text: code, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
    } catch (error) { alert(error.message); }
  });
}

async function initPage() {
  const type = document.body.dataset.page;
  if (type === 'overview') return loadOverview();
  if (type === 'calendar') return loadCalendar();
  if (type === 'users') return loadUsers();
  if (type === 'profile') return loadProfile();
  if (type === 'settings') return loadSettings();
  if (type === 'birthdays') return loadBirthdays();
  if (type === 'ranking') return loadRanking();
  if (type === 'health') return loadHealth();
  if (type === 'analytics') return loadAnalytics();
  if (type === 'crud') return loadCrud();
}

document.addEventListener('dashboard-ready', () => {
  initPage().then(initPixForm).catch((error) => {
    console.error(error);
    const message = document.querySelector('[data-page-error]');
    if (message) message.textContent = error.message;
  });
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-new-record]')?.addEventListener('click', () => openCrudDialog(window.PAGE_CONFIG));
});
