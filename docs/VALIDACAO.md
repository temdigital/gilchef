# Validação técnica do pacote

## Verificações executadas antes da entrega

- Sintaxe dos arquivos JavaScript externos.
- Sintaxe dos scripts JavaScript embutidos nas páginas.
- Parse sintático do SQL PostgreSQL.
- Validação dos arquivos JSON gerados dentro das páginas CRUD.
- Existência de todos os recursos locais referenciados por HTML.
- Ausência de referências ativas a Vercel, Google Calendar, Google AdSense e à marca anterior.
- Compatibilidade de caminhos para domínio próprio e repositório GitHub Pages em subpasta.
- Presença de workflow, CNAME, sitemap, robots e página 404.

## Limites da validação local

Os seguintes testes dependem do ambiente do usuário:

- Execução real do SQL no projeto Supabase criado.
- Envio de e-mails pelo Supabase Auth.
- Aplicação real das RLS com os quatro perfis.
- Deploy e execução da Edge Function.
- Publicação no GitHub Pages.
- Resolução do DNS e certificado do domínio.
- Abertura do WhatsApp no dispositivo final.

Execute `scripts/validar-projeto.py` antes de cada nova publicação.
