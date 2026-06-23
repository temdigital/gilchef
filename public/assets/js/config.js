(() => {
  const state = { client: null, settings: null };

  function detectBasePath() {
    const script = [...document.scripts].find((item) => /\/assets\/js\/config\.js(?:\?|$)/.test(item.src));
    if (!script) return '/';
    const url = new URL(script.src, location.href);
    return url.pathname.replace(/assets\/js\/config\.js.*$/, '');
  }

  const basePath = detectBasePath();

  function url(path = '') {
    const clean = String(path).replace(/^\/+/, '');
    return `${basePath}${clean}`.replace(/\/{2,}/g, '/');
  }

  function isConfigured() {
    const config = window.GIL_SUPABASE_CONFIG || {};
    return Boolean(
      /^https:\/\/.+\.supabase\.co$/i.test(config.url || '') &&
      config.key &&
      !String(config.key).includes('COLE_AQUI')
    );
  }

  async function getClient() {
    if (state.client) return state.client;
    if (!isConfigured()) {
      throw new Error('Supabase ainda não configurado. Preencha assets/js/supabase-config.js.');
    }
    if (!window.supabase?.createClient) {
      throw new Error('Biblioteca local do Supabase não carregada.');
    }
    const config = window.GIL_SUPABASE_CONFIG;
    state.client = window.supabase.createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
    return state.client;
  }

  async function getSettings(force = false) {
    if (state.settings && !force) return state.settings;
    const client = await getClient();
    const { data, error } = await client.from('configuracoes_publicas').select('*').maybeSingle();
    if (error) throw error;
    state.settings = data || {};
    return state.settings;
  }

  async function getSession() {
    const client = await getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function invoke(functionName, body = {}) {
    const client = await getClient();
    const { data, error } = await client.functions.invoke(functionName, { body });
    if (error) throw error;
    return data;
  }

  function rewriteLocalLinks() {
    if (basePath === '/') return;
    document.querySelectorAll('a[href^="/"], img[src^="/"], script[src^="/"], link[href^="/"]').forEach((element) => {
      const attribute = element.hasAttribute('href') ? 'href' : 'src';
      const value = element.getAttribute(attribute);
      if (!value || value.startsWith('//')) return;
      element.setAttribute(attribute, url(value));
    });
  }

  window.GilApp = {
    state,
    basePath,
    url,
    isConfigured,
    getClient,
    getSettings,
    getSession,
    invoke,
    rewriteLocalLinks
  };
})();
