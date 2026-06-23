# Conferência de impacto — substituição integral

## Alteração estrutural

O projeto anterior foi substituído por uma arquitetura única em HTML, CSS e JavaScript no GitHub Pages, integrada diretamente ao Supabase. Vercel e Google Calendar foram removidos.

## Arquivos afetados

- Todas as páginas públicas e autenticadas.
- Todos os arquivos CSS e JavaScript.
- Identidade visual e imagens oficiais.
- Workflow de publicação do GitHub Pages.
- Estrutura SQL integral.
- Documentação de implantação e testes.

## Tabelas afetadas

O projeto usa um banco novo, sem dados legados. As principais estruturas são:

- `usuarios`, `convites` e `configuracoes_sistema`;
- `servicos`, `cardapios`, `publicacoes`, `eventos_publicos`, `promocoes`, `parceiros` e `videos`;
- `solicitacoes_publicas`, `reservas`, `disponibilidade`, `bloqueios_agenda`, `pedidos` e `pedido_itens`;
- `lancamentos_financeiros`, `favoritos`, `avaliacoes`, `pontos_movimentacoes`, `recompensas` e `resgates_recompensas`;
- `mensagens_modelo`, `solicitacoes_remocao`, `logs_auditoria` e `metricas_site`.

## Funções e triggers afetados

- Criação automática do perfil único após cadastro no Supabase Auth.
- Slugs automáticos e imutáveis.
- Validação de idade e WhatsApp.
- Convites com validade de 30 dias.
- Conflitos de reservas, preparação, deslocamento e compromissos internos.
- Pontos após serviço concluído e pago.
- Avaliações somente de serviços próprios concluídos e pagos.
- Auditoria, protocolos públicos, disponibilidade e métricas agregadas.

## Policies afetadas

Todas as tabelas operacionais possuem RLS. Os acessos são separados por `cliente`, `assistente`, `chef` e `administrador`. Dados pessoais não são expostos em páginas públicas.

## Riscos e mitigação

| Risco | Mitigação aplicada |
|---|---|
| Chave administrativa exposta | O frontend aceita somente chave pública; operações privilegiadas ficam na Edge Function |
| Conta elevada criada indevidamente | Cadastro público sempre nasce cliente; convite e banco validam papéis |
| Duplicidade de Chef ou administrador | Índices únicos parciais no banco |
| Conflito de agenda | Triggers validam reservas e compromissos internos |
| Formulário abrir WhatsApp sem registro | RPC salva e gera protocolo antes de abrir `wa.me` |
| Exclusão indevida | Confirmação, aprovação administrativa e função exclusiva do superadministrador |
| Rastreamento não autorizado | Métricas ficam desativadas por padrão e não usam cookies, IP ou identificador individual |
| URLs antigas | Arquivos equivalentes e página 404 de compatibilidade |
| Dependência externa de fontes | Tipografia usa fontes do sistema, sem download de fontes de terceiros |

## Dependências pendentes

- URL pública e chave pública do Supabase.
- Configuração do GitHub Pages e DNS do domínio.
- Conta de e-mail operacional.
- Revisão jurídica final.
