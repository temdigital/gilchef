import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function publicationReference(value = '') {
  const trimmed = value.trim();
  if (isUuid(trimmed)) return { id: trimmed, slug: null };
  try {
    const parsed = new URL(trimmed);
    return { id: null, slug: parsed.searchParams.get('slug') || parsed.pathname.split('/').filter(Boolean).pop()?.replace('.html', '') || null };
  } catch {
    return { id: null, slug: trimmed || null };
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Método não permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  // Compatibilidade com as chaves atuais (Publishable/Secret) e legadas (anon/service_role).
  const parseKeyMap = (name: string): Record<string, string> => {
    try { return JSON.parse(Deno.env.get(name) || '{}'); } catch { return {}; }
  };
  const publishableKeys = parseKeyMap('SUPABASE_PUBLISHABLE_KEYS');
  const secretKeys = parseKeyMap('SUPABASE_SECRET_KEYS');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY')
    || publishableKeys.default
    || Object.values(publishableKeys)[0];
  const privilegedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    || secretKeys.default
    || Object.values(secretKeys)[0];
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !publicKey || !privilegedKey) return json(500, { error: 'Segredos da função não configurados.' });
  if (!authorization) return json(401, { error: 'Sessão ausente.' });

  const sessionClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false }
  });
  const admin = createClient(supabaseUrl, privilegedKey, { auth: { persistSession: false } });

  const { data: authData, error: authError } = await sessionClient.auth.getUser();
  if (authError || !authData.user) return json(401, { error: 'Sessão inválida.' });

  const { data: caller, error: callerError } = await admin
    .from('usuarios')
    .select('id,tipo_usuario,eh_superadministrador,status')
    .eq('id', authData.user.id)
    .is('excluido_em', null)
    .single();
  if (callerError || caller?.tipo_usuario !== 'administrador' || !caller.eh_superadministrador || caller.status !== 'ativo') {
    return json(403, { error: 'Somente o superadministrador pode processar exclusões.' });
  }

  const body = await request.json().catch(() => ({}));
  const solicitacaoId = String(body?.solicitacao_id || '');
  if (!isUuid(solicitacaoId)) return json(400, { error: 'Solicitação inválida.' });

  const { data: removal, error: removalError } = await admin
    .from('solicitacoes_remocao')
    .select('*')
    .eq('id', solicitacaoId)
    .is('excluido_em', null)
    .single();
  if (removalError || !removal) return json(404, { error: 'Solicitação não encontrada.' });
  if (removal.status !== 'aprovada') return json(409, { error: 'A solicitação precisa estar aprovada antes do processamento.' });

  try {
    if (removal.tipo === 'publicacao') {
      const reference = publicationReference(removal.url_ou_identificador || '');
      let query = admin.from('publicacoes').update({ status: 'arquivada', excluido_em: new Date().toISOString() });
      query = reference.id ? query.eq('id', reference.id) : query.eq('slug', reference.slug);
      const { data: posts, error: postError } = await query.select('id');
      if (postError) throw postError;
      if (!posts?.length) return json(404, { error: 'Publicação não encontrada.' });
    } else {
      const { data: target, error: targetError } = await admin
        .from('usuarios')
        .select('id,email')
        .ilike('email', removal.email)
        .is('excluido_em', null)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return json(404, { error: 'Perfil não encontrado para o e-mail confirmado.' });
      if (target.id === caller.id) return json(409, { error: 'O superadministrador não pode remover a própria conta por este fluxo.' });

      const [{ data: reservations }, { data: orders }, { data: requests }] = await Promise.all([
        admin.from('reservas').select('id').eq('usuario_id', target.id),
        admin.from('pedidos').select('id').eq('usuario_id', target.id),
        admin.from('solicitacoes_publicas').select('id').eq('usuario_id', target.id)
      ]);

      const now = new Date().toISOString();
      const operations = [
        admin.from('reservas').update({
          nome_cliente: 'Cliente removido', email_cliente: null, whatsapp_cliente: 'anonimizado', endereco_evento: null,
          preferencias: null, restricoes_alimentares: null, mensagem: null, observacoes_internas: null
        }).eq('usuario_id', target.id),
        admin.from('pedidos').update({
          nome_cliente: 'Cliente removido', email_cliente: null, whatsapp_cliente: 'anonimizado', endereco_entrega: null, observacoes: null
        }).eq('usuario_id', target.id),
        admin.from('solicitacoes_publicas').update({
          nome: 'Solicitante removido', email: null, whatsapp: 'anonimizado', mensagem: null, observacoes_internas: null,
          dados_adicionais: {}, origem: null
        }).eq('usuario_id', target.id),
        admin.from('usuarios').update({
          nome: 'Usuário removido', nome_exibicao: 'Removido', email: `removido+${target.id}@anonimo.invalid`, whatsapp: null,
          cidade: null, data_nascimento: null, foto_url: null, biografia: null, preferencias_alimentares: null,
          alergias: null, restricoes: null, endereco: null, observacoes_internas: null, instagram: null, facebook: null,
          tiktok: null, kwai: null, outro_link: null, status: 'inativo', participa_ranking: false, excluido_em: now
        }).eq('id', target.id)
      ];
      const results = await Promise.all(operations);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      const { error: deleteError } = await admin.auth.admin.deleteUser(target.id, false);
      if (deleteError) throw deleteError;

      const logIds: Array<{ table: string; ids: string[] }> = [
        { table: 'reservas', ids: (reservations || []).map((item) => item.id) },
        { table: 'pedidos', ids: (orders || []).map((item) => item.id) },
        { table: 'solicitacoes_publicas', ids: (requests || []).map((item) => item.id) },
        { table: 'usuarios', ids: [target.id] }
      ];
      await admin.from('logs_auditoria').update({ usuario_email: null, valores_anteriores: null, valores_posteriores: null }).eq('usuario_id', target.id);
      for (const entry of logIds) {
        if (entry.ids.length) {
          await admin.from('logs_auditoria').update({ usuario_email: null, valores_anteriores: null, valores_posteriores: null })
            .eq('tabela', entry.table).in('registro_id', entry.ids);
        }
      }
    }

    const { error: concludeError } = await admin.from('solicitacoes_remocao').update({
      status: 'concluida',
      resposta: 'Solicitação processada com anonimização e preservação apenas dos registros legalmente necessários.',
      analisado_por: caller.id,
      nome: 'Solicitante anonimizado',
      email: `anonimizado+${solicitacaoId}@invalid.local`,
      whatsapp: null,
      url_ou_identificador: null,
      justificativa: null
    }).eq('id', solicitacaoId);
    if (concludeError) throw concludeError;

    await admin.from('logs_auditoria').update({ usuario_email: null, valores_anteriores: null, valores_posteriores: null })
      .eq('tabela', 'solicitacoes_remocao').eq('registro_id', solicitacaoId);

    return json(200, { ok: true, mensagem: 'Solicitação processada com sucesso.' });
  } catch (error) {
    console.error(error);
    return json(500, { error: error instanceof Error ? error.message : 'Falha ao processar a remoção.' });
  }
});
