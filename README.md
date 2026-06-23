# Gil Personal Chef

Projeto integral do site e sistema de gestão do **Gil Personal Chef**, com o slogan **Alta Gastronomia com Sabor Caseiro**.

## Arquitetura definitiva

- **Frontend:** HTML, CSS e JavaScript puro.
- **Hospedagem:** GitHub Pages, publicado pela GitHub Actions.
- **Banco, autenticação e armazenamento:** Supabase.
- **Operações administrativas privilegiadas:** Supabase Edge Function, somente para o fluxo de remoção aprovado, com autenticação e autorização validadas dentro da função.
- **Agenda:** interna, sem Google Calendar.
- **Domínio preparado:** `chefgil.com.br`.
- **Sem Vercel, Google AdSense ou publicidade.**

## Estrutura

```text
.github/workflows/pages.yml       Publicação automática no GitHub Pages
public/                           Site pronto para hospedagem
  assets/                         CSS, JavaScript, imagens oficiais e bibliotecas locais
  dashboard/                      Painéis por perfil
supabase/01-estrutura-completa.sql Banco completo, funções, RLS, storage e dados iniciais
supabase/functions/               Função segura para remoções aprovadas
docs/                             Impacto, implantação, testes e validação
```

## Perfis

- `cliente`: perfil privado, pedidos, reservas, favoritos, avaliações, pontos e recompensas.
- `assistente`: operação de agenda, solicitações, reservas, pedidos e clientes.
- `chef`: operação, serviços, cardápios, conteúdo, promoções, parceiros, financeiro e convites.
- `administrador`: gestão integral, configurações, usuários, logs, saúde e remoções.
- O único administrador pode possuir `eh_superadministrador = true`.

O banco impede mais de um administrador ativo e mais de um Chef ativo.

## Implantação resumida

1. Crie um projeto novo no Supabase.
2. Execute `supabase/01-estrutura-completa.sql` no SQL Editor.
3. Copie **somente** a URL pública do projeto e a chave pública Publishable/anon para `public/assets/js/supabase-config.js`.
4. Configure as URLs de autenticação no Supabase.
5. Cadastre a primeira conta e promova-a a administrador pelo SQL indicado no final do script.
6. Publique o repositório no GitHub e habilite o GitHub Pages por **GitHub Actions**.
7. Implante a Edge Function `processar-remocao` para concluir exclusões aprovadas.
8. Configure o domínio `chefgil.com.br` quando o DNS estiver disponível.

As instruções completas estão em `docs/IMPLANTACAO.md`.

## Chaves do Supabase

No navegador entram apenas:

```js
window.GIL_SUPABASE_CONFIG = Object.freeze({
  url: 'https://SEU-PROJETO.supabase.co',
  key: 'SUA_CHAVE_PUBLICA_PUBLISHABLE_OU_ANON'
});
```

**Nunca coloque no repositório:** `service_role`, secret key, senha do banco, access token pessoal ou qualquer segredo administrativo.

## Funcionalidades incluídas

Site público, serviços, páginas individuais, cardápios, disponibilidade, orçamentos, encomendas, WhatsApp com protocolo, eventos públicos, blog, promoções, parceiros, vídeos, cadastro, login, recuperação de senha, perfil único, agenda interna, bloqueios, reservas, pedidos, clientes, convites, aniversariantes, favoritos, avaliações, pontos, ranking anonimizado, recompensas, Pix estático, financeiro, métricas agregadas opcionais, logs, saúde do sistema, LGPD e solicitações de remoção.

## Recursos oficiais

O projeto utiliza a fotografia enviada do Chef Gil e o símbolo extraído do logotipo oficial. A antiga denominação “Buffet & Congelados” não aparece na identidade nem nos arquivos distribuídos.

## Observação jurídica

Os textos de Privacidade, Termos e Cancelamento são uma base operacional e devem passar por revisão jurídica antes da publicação definitiva.
