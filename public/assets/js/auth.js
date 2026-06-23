const LOGIN_ATTEMPTS_KEY = 'gil_login_attempts';
const LOGIN_LOCK_KEY = 'gil_login_locked_until';

function loginLockRemaining() {
  return Math.max(0, Number(localStorage.getItem(LOGIN_LOCK_KEY) || 0) - Date.now());
}

function recordLoginFailure() {
  const attempts = Number(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || 0) + 1;
  if (attempts >= 5) {
    localStorage.setItem(LOGIN_LOCK_KEY, String(Date.now() + 30000));
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, '0');
  } else {
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, String(attempts));
  }
}

function clearLoginFailures() {
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  localStorage.removeItem(LOGIN_LOCK_KEY);
}

async function signIn(email, password) {
  const remaining = loginLockRemaining();
  if (remaining > 0) {
    throw new Error(`Aguarde ${Math.ceil(remaining / 1000)} segundos para tentar novamente.`);
  }

  const client = await GilApp.getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    recordLoginFailure();
    throw error;
  }

  clearLoginFailures();
  if (data.user) {
    await client.from('usuarios').update({ ultimo_login_em: new Date().toISOString() }).eq('id', data.user.id);
    await client.from('logs_auditoria').insert({
      usuario_id: data.user.id,
      usuario_email: data.user.email,
      acao: 'login',
      tabela: 'autenticacao',
      registro_id: data.user.id,
      navegador: navigator.userAgent.slice(0, 500)
    });
  }
  return data;
}

async function signUp(payload) {
  const client = await GilApp.getClient();
  const { data, error } = await client.auth.signUp({
    email: payload.email,
    password: payload.senha,
    options: {
      emailRedirectTo: new URL(GilApp.url('login.html'), location.origin).href,
      data: {
        nome: payload.nome,
        nome_exibicao: payload.nome_exibicao || payload.nome,
        whatsapp: normalizeBrazilianPhone(payload.whatsapp),
        cidade: payload.cidade,
        data_nascimento: payload.data_nascimento,
        aceite_termos: true,
        aceite_privacidade: true,
        aceite_whatsapp: true,
        convite_token: payload.convite_token || null
      }
    }
  });
  if (error) throw error;
  return data;
}

async function resetPassword(email) {
  const client = await GilApp.getClient();
  const redirectTo = new URL(GilApp.url('redefinir-senha.html'), location.origin).href;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

async function updatePassword(password) {
  const client = await GilApp.getClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

async function currentProfile() {
  const client = await GilApp.getClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return null;
  const { data, error } = await client
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .is('excluido_em', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function requireAuth() {
  const profile = await currentProfile();
  if (!profile) {
    const retorno = encodeURIComponent(location.pathname + location.search);
    location.href = `${GilApp.url('login.html')}?retorno=${retorno}`;
    throw new Error('Não autenticado.');
  }
  if (profile.status !== 'ativo') {
    throw new Error('Conta indisponível. Entre em contato com o atendimento.');
  }
  return profile;
}

async function logout() {
  const client = await GilApp.getClient();
  await client.auth.signOut();
  location.href = GilApp.url('login.html');
}

window.GilAuth = { signIn, signUp, resetPassword, updatePassword, currentProfile, requireAuth, logout };
