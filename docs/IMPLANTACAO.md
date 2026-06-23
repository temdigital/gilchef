# Implantação — GitHub Pages e Supabase

## 1. Criar o Supabase

1. Crie um projeto novo.
2. Abra **SQL Editor**.
3. Cole e execute o arquivo completo `supabase/01-estrutura-completa.sql` uma única vez.
4. Confirme no Table Editor a criação das tabelas.
5. Confirme em Storage a criação do bucket público `midias`.

O script é destrutivo para as tabelas do schema `public` que tenham os mesmos nomes. Use somente no projeto novo destinado ao Gil Personal Chef.

## 2. Configurar a chave pública

No Supabase, copie:

- **Project URL**;
- **Publishable key** ou, em projetos legados, a chave pública `anon`.

Edite `public/assets/js/supabase-config.js`:

```js
window.GIL_SUPABASE_CONFIG = Object.freeze({
  url: 'https://SEU-PROJETO.supabase.co',
  key: 'SUA_CHAVE_PUBLICA'
});
```

Não copie `service_role`, secret key, senha do banco ou token pessoal para esse arquivo.

## 3. Configurar autenticação

Em **Authentication → URL Configuration**:

- Site URL provisória: endereço do GitHub Pages, por exemplo `https://USUARIO.github.io/REPOSITORIO/`;
- Depois do domínio: `https://chefgil.com.br`;
- Redirect URLs:
  - `https://USUARIO.github.io/REPOSITORIO/login.html`;
  - `https://USUARIO.github.io/REPOSITORIO/redefinir-senha.html`;
  - `https://chefgil.com.br/login.html`;
  - `https://chefgil.com.br/redefinir-senha.html`.

Em **Authentication → Providers → Email**, mantenha e-mail/senha habilitado. A confirmação de e-mail é recomendada.

## 4. Criar o primeiro administrador

1. Publique provisoriamente o site ou execute-o em servidor local.
2. Faça o primeiro cadastro público.
3. No SQL Editor, execute:

```sql
update public.usuarios
set tipo_usuario = 'administrador',
    eh_superadministrador = true
where email = 'EMAIL_DO_ADMINISTRADOR';
```

4. Entre novamente no site.
5. Pelo painel, envie o convite do perfil `chef` para Gil e convites de `assistente` quando necessário.

O banco permite apenas um administrador ativo e um Chef ativo.

## 5. Implantar a função de remoção

A exclusão definitiva do usuário no Supabase Auth exige uma operação privilegiada. Ela está isolada em `supabase/functions/processar-remocao`.

Com o Supabase CLI instalado:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy processar-remocao
```

A plataforma injeta os segredos internos necessários na função. A função aceita o formato atual de chaves Publishable/Secret e o formato legado anon/service_role. Ela valida a sessão e a condição de superadministrador internamente; nunca grave secret key ou `SUPABASE_SERVICE_ROLE_KEY` no GitHub.

Fluxo de uso:

1. A solicitação pública recebe protocolo.
2. O administrador confirma a identidade e muda o status para `aprovada`.
3. O botão **Processar** aparece.
4. Somente o superadministrador consegue executar a função.
5. Perfil e conteúdo são removidos ou anonimizados, mantendo apenas registros legalmente necessários.

## 6. Publicar no GitHub Pages

1. Crie um repositório GitHub.
2. Envie todo o conteúdo deste pacote, preservando as pastas.
3. Use a branch `main`.
4. Em **Settings → Pages**, escolha **GitHub Actions** como fonte.
5. O workflow `.github/workflows/pages.yml` publicará somente a pasta `public`.
6. Acompanhe a execução em **Actions**.

## 7. Domínio próprio

O arquivo `public/CNAME` já contém `chefgil.com.br`.

Quando o domínio estiver disponível:

1. Informe `chefgil.com.br` em **Settings → Pages → Custom domain**.
2. Cadastre no provedor de DNS os registros indicados pelo GitHub.
3. Ative **Enforce HTTPS** após a validação.
4. Atualize Site URL e Redirect URLs no Supabase.

Enquanto o domínio não estiver apontado, remova temporariamente `public/CNAME` para publicar apenas no endereço `github.io`, ou configure o domínio antes do primeiro deploy.

## 8. Configurações no painel

Depois do primeiro acesso administrativo, revise:

- WhatsApp oficial;
- e-mail público;
- horário e região de atendimento;
- raio de 100 km, taxa fixa e valor por quilômetro;
- chave, nome e cidade do Pix;
- redes sociais;
- serviços, cardápios, disponibilidade e mensagens de WhatsApp.

## 9. Agenda

A agenda é interna. Reservas, horários de preparação, deslocamentos e compromissos privados são armazenados no Supabase. Não existe dependência do Google Calendar.

## 10. Analytics

As métricas agregadas ficam desativadas por padrão. Quando `analytics_ativo` for habilitado pelo administrador, o sistema contabiliza apenas rota, data, domínio de referência e categoria de dispositivo, sem cookies, IP ou identificador pessoal. Google Analytics não é carregado automaticamente.
