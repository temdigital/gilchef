-- Gil Personal Chef
-- Estrutura integral do banco Supabase em Português do Brasil
-- Arquitetura: HTML/CSS/JavaScript no GitHub Pages + Supabase (sem Vercel e sem Google Calendar)
-- Execute uma única vez no SQL Editor de um projeto novo.
begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Limpeza segura apenas do schema public do projeto novo.
drop view if exists public.ranking_clientes cascade;
drop view if exists public.aniversariantes_do_mes cascade;
drop view if exists public.disponibilidade_publica cascade;
drop view if exists public.configuracoes_publicas cascade;
drop view if exists public.promocoes_publicas cascade;

drop table if exists public.metricas_site cascade;
drop table if exists public.logs_auditoria cascade;
drop table if exists public.solicitacoes_remocao cascade;
drop table if exists public.mensagens_modelo cascade;
drop table if exists public.convites cascade;
drop table if exists public.resgates_recompensas cascade;
drop table if exists public.recompensas cascade;
drop table if exists public.pontos_movimentacoes cascade;
drop table if exists public.avaliacoes cascade;
drop table if exists public.favoritos cascade;
drop table if exists public.videos cascade;
drop table if exists public.parceiros cascade;
drop table if exists public.eventos_publicos cascade;
drop table if exists public.promocoes cascade;
drop table if exists public.publicacoes cascade;
drop table if exists public.lancamentos_financeiros cascade;
drop table if exists public.pedido_itens cascade;
drop table if exists public.pedidos cascade;
drop table if exists public.bloqueios_agenda cascade;
drop table if exists public.disponibilidade cascade;
drop table if exists public.reservas cascade;
drop table if exists public.solicitacoes_publicas cascade;
drop table if exists public.cardapios cascade;
drop table if exists public.servicos cascade;
drop table if exists public.configuracoes_sistema cascade;
drop table if exists public.usuarios cascade;

-- Utilitários
create or replace function public.somente_digitos(valor text)
returns text language sql immutable as $$ select regexp_replace(coalesce(valor,''), '\D', '', 'g') $$;

create or replace function public.normalizar_slug(valor text)
returns text language sql immutable set search_path=public,extensions as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(valor,''))), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.gerar_protocolo(prefixo text)
returns text language sql volatile as $$
  select upper(prefixo)||'-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,8))
$$;

create or replace function public.atualizar_timestamp()
returns trigger language plpgsql as $$
begin new.atualizado_em=now(); return new; end $$;

-- Fonte única de verdade para todas as pessoas
create table public.usuarios (
 id uuid primary key references auth.users(id) on delete cascade,
 nome text not null,
 nome_exibicao text not null,
 email text not null unique,
 whatsapp text,
 cidade text,
 data_nascimento date,
 slug text not null unique,
 tipo_usuario text not null default 'cliente' check (tipo_usuario in ('cliente','assistente','chef','administrador')),
 eh_superadministrador boolean not null default false,
 status text not null default 'ativo' check (status in ('ativo','bloqueado','inativo')),
 foto_url text,
 biografia text,
 preferencias_alimentares text,
 alergias text,
 restricoes text,
 endereco text,
 observacoes_internas text,
 instagram text,
 facebook text,
 tiktok text,
 kwai text,
 outro_link text,
 aceite_termos boolean not null default false,
 aceite_privacidade boolean not null default false,
 aceite_whatsapp boolean not null default false,
 participa_ranking boolean not null default true,
 consentido_em timestamptz,
 ultimo_login_em timestamptz,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 excluido_em timestamptz
);
comment on table public.usuarios is 'Perfil único e privado de cada pessoa, ligado ao auth.users.id.';
create unique index idx_usuario_administrador_unico on public.usuarios(tipo_usuario) where tipo_usuario='administrador' and excluido_em is null;
create unique index idx_usuario_chef_unico on public.usuarios(tipo_usuario) where tipo_usuario='chef' and excluido_em is null;

create or replace function public.tipo_usuario_atual()
returns text language sql stable security definer set search_path=public as $$
 select tipo_usuario from public.usuarios where id=auth.uid() and excluido_em is null and status='ativo'
$$;
create or replace function public.eh_administrador()
returns boolean language sql stable security definer set search_path=public as $$ select public.tipo_usuario_atual()='administrador' $$;
create or replace function public.eh_chef()
returns boolean language sql stable security definer set search_path=public as $$ select public.tipo_usuario_atual()='chef' $$;
create or replace function public.eh_assistente()
returns boolean language sql stable security definer set search_path=public as $$ select public.tipo_usuario_atual()='assistente' $$;
create or replace function public.eh_equipe()
returns boolean language sql stable security definer set search_path=public as $$ select public.tipo_usuario_atual() in ('assistente','chef','administrador') $$;
create or replace function public.eh_chef_ou_admin()
returns boolean language sql stable security definer set search_path=public as $$ select public.tipo_usuario_atual() in ('chef','administrador') $$;

create or replace function public.slug_usuario_unico(base text, usuario_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare candidato text:=public.normalizar_slug(base); n integer:=0;
begin
 if candidato='' then candidato:='usuario'; end if;
 while exists(select 1 from public.usuarios where slug=candidato and id<>coalesce(usuario_id,'00000000-0000-0000-0000-000000000000'::uuid)) loop
  n:=n+1; candidato:=public.normalizar_slug(base)||'-'||n;
 end loop;
 return candidato;
end $$;

create or replace function public.preparar_usuario()
returns trigger language plpgsql security definer set search_path=public as $$
declare pode_administrar boolean;
begin
 pode_administrar:=public.eh_administrador() or auth.role()='service_role' or current_user in ('postgres','supabase_admin');
 new.email=lower(trim(new.email));
 new.whatsapp=nullif(public.somente_digitos(new.whatsapp),'');
 if new.whatsapp is not null and new.whatsapp !~ '^55[0-9]{10,11}$' then raise exception 'WhatsApp deve conter país 55, DDD e número.'; end if;
 if tg_op='INSERT' then
  new.slug=public.slug_usuario_unico(coalesce(nullif(new.nome_exibicao,''),new.nome),new.id);
 else
  new.slug=old.slug;
  if not pode_administrar then
   new.tipo_usuario=old.tipo_usuario; new.eh_superadministrador=old.eh_superadministrador;
   new.status=old.status; new.email=old.email; new.observacoes_internas=old.observacoes_internas;
  end if;
 end if;
 if new.tipo_usuario='cliente' and new.excluido_em is null then
  if new.data_nascimento is null then raise exception 'Data de nascimento obrigatória para clientes.'; end if;
  if new.data_nascimento > (current_date - interval '18 years')::date then raise exception 'Cadastro permitido somente para maiores de 18 anos.'; end if;
 end if;
 if new.tipo_usuario<>'administrador' then new.eh_superadministrador=false; end if;
 if new.eh_superadministrador and new.tipo_usuario<>'administrador' then raise exception 'Superadministrador deve possuir perfil administrador.'; end if;
 new.atualizado_em=now(); return new;
end $$;
create trigger trg_preparar_usuario before insert or update on public.usuarios for each row execute function public.preparar_usuario();

-- Convites precisam existir antes do trigger de criação de perfil.
create table public.convites (
 id uuid primary key default extensions.gen_random_uuid(),
 nome text not null,
 email text not null,
 whatsapp text not null,
 tipo_usuario text not null check (tipo_usuario in ('cliente','assistente','chef','administrador')),
 token text not null unique default encode(extensions.gen_random_bytes(24),'hex'),
 status text not null default 'pendente' check (status in ('pendente','aceito','cancelado','expirado')),
 expira_em timestamptz not null default (now() + interval '30 days'),
 criado_por uuid references public.usuarios(id) on delete set null,
 aceito_por uuid references public.usuarios(id) on delete set null,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 excluido_em timestamptz
);
create trigger trg_convites_timestamp before update on public.convites for each row execute function public.atualizar_timestamp();

create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path=public as $$
declare meta jsonb:=coalesce(new.raw_user_meta_data,'{}'::jsonb); convite public.convites%rowtype; papel text:='cliente';
begin
 if meta->>'convite_token' is not null then
  select * into convite from public.convites
  where token=meta->>'convite_token' and status='pendente' and expira_em>now() and lower(email)=lower(new.email)
  limit 1;
  if found then papel:=convite.tipo_usuario; end if;
 end if;
 insert into public.usuarios(id,nome,nome_exibicao,email,whatsapp,cidade,data_nascimento,tipo_usuario,
   aceite_termos,aceite_privacidade,aceite_whatsapp,consentido_em)
 values(new.id,coalesce(nullif(meta->>'nome',''),split_part(new.email,'@',1)),
   coalesce(nullif(meta->>'nome_exibicao',''),nullif(meta->>'nome',''),split_part(new.email,'@',1)),
   new.email,meta->>'whatsapp',meta->>'cidade',nullif(meta->>'data_nascimento','')::date,papel,
   coalesce((meta->>'aceite_termos')::boolean,false),coalesce((meta->>'aceite_termos')::boolean,false),
   coalesce((meta->>'aceite_whatsapp')::boolean,false),case when coalesce((meta->>'aceite_termos')::boolean,false) then now() end);
 if found then
  update public.convites set status='aceito',aceito_por=new.id where id=convite.id;
 end if;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.criar_perfil_novo_usuario();

-- Configuração central
create table public.configuracoes_sistema (
 id smallint primary key default 1 check(id=1),
 nome_site text not null default 'Gil Personal Chef',
 slogan text not null default 'Alta Gastronomia com Sabor Caseiro',
 whatsapp text not null default '5561999289239',
 email_contato text default 'contato@chefgil.com.br',
 horario_atendimento text default 'Segunda a sábado, das 8h às 20h',
 regiao_atendimento text default 'Distrito Federal e municípios próximos',
 raio_atendimento_km numeric(8,2) not null default 100,
 taxa_deslocamento_fixa numeric(10,2) not null default 0,
 valor_km numeric(10,2) not null default 0,
 instagram text default 'https://www.instagram.com/castrogildesio',
 facebook text,
 tiktok text,
 kwai text,
 pix_tipo_chave text check (pix_tipo_chave in ('cpf','cnpj','email','telefone','aleatoria')),
 pix_chave text,
 pix_nome text default 'GIL PERSONAL CHEF',
 pix_cidade text default 'BRASILIA',
 google_analytics_id text,
 analytics_ativo boolean not null default false,
 atualizado_em timestamptz not null default now()
);
insert into public.configuracoes_sistema(id) values(1);
create or replace function public.preparar_configuracoes()
returns trigger language plpgsql set search_path=public as $$
begin
 new.whatsapp=public.somente_digitos(new.whatsapp);
 if length(new.whatsapp) in (10,11) then new.whatsapp='55'||new.whatsapp; end if;
 if new.whatsapp !~ '^55[0-9]{10,11}$' then raise exception 'WhatsApp oficial inválido.'; end if;
 new.email_contato=nullif(lower(trim(new.email_contato)),'');
 new.atualizado_em=now();
 return new;
end $$;
create trigger trg_preparar_config before insert or update on public.configuracoes_sistema for each row execute function public.preparar_configuracoes();

create view public.configuracoes_publicas as
select nome_site,slogan,whatsapp,email_contato,horario_atendimento,regiao_atendimento,raio_atendimento_km,
 instagram,facebook,tiktok,kwai,google_analytics_id,analytics_ativo,atualizado_em
from public.configuracoes_sistema where id=1;

-- Slugs de conteúdo
create or replace function public.preparar_slug_generico()
returns trigger language plpgsql security definer set search_path=public as $$
declare base text; candidato text; n integer:=0; existe boolean;
begin
 if tg_op='UPDATE' and old.slug is not null then new.slug=old.slug; return new; end if;
 base:=coalesce(nullif(to_jsonb(new)->>'slug',''),nullif(to_jsonb(new)->>'nome',''),nullif(to_jsonb(new)->>'titulo',''),'item');
 candidato:=public.normalizar_slug(base);
 loop
  execute format('select exists(select 1 from public.%I where slug=$1 and id<>$2)',tg_table_name) into existe using candidato,new.id;
  exit when not existe; n:=n+1; candidato:=public.normalizar_slug(base)||'-'||n;
 end loop;
 new.slug=candidato; return new;
end $$;

create table public.servicos (
 id uuid primary key default extensions.gen_random_uuid(),
 nome text not null, slug text not null unique, categoria text not null,
 resumo text, descricao text, imagem_url text,
 preco_a_partir numeric(10,2), preco_visivel boolean not null default false,
 quantidade_minima integer, quantidade_maxima integer, duracao_minutos integer,
 itens_inclusos text, adicionais text, restricoes text, regiao_atendida text,
 ordem integer not null default 0, ativo boolean not null default true,
 criado_por uuid references public.usuarios(id) on delete set null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_servicos_slug before insert or update on public.servicos for each row execute function public.preparar_slug_generico();
create trigger trg_servicos_timestamp before update on public.servicos for each row execute function public.atualizar_timestamp();

create table public.cardapios (
 id uuid primary key default extensions.gen_random_uuid(),
 nome text not null, slug text not null unique, categoria text not null,
 descricao text, itens jsonb not null default '[]'::jsonb, imagem_url text,
 preco_a_partir numeric(10,2), preco_visivel boolean not null default false,
 ordem integer not null default 0, ativo boolean not null default true,
 criado_por uuid references public.usuarios(id) on delete set null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_cardapios_slug before insert or update on public.cardapios for each row execute function public.preparar_slug_generico();
create trigger trg_cardapios_timestamp before update on public.cardapios for each row execute function public.atualizar_timestamp();

create table public.solicitacoes_publicas (
 id uuid primary key default extensions.gen_random_uuid(),
 protocolo text not null unique default public.gerar_protocolo('SOL'),
 tipo text not null check(tipo in ('orcamento','encomenda','contato')),
 usuario_id uuid references public.usuarios(id) on delete set null,
 nome text not null, email text, whatsapp text not null, servico_interesse text,
 data_desejada date, quantidade_convidados integer, mensagem text, dados_adicionais jsonb not null default '{}'::jsonb, origem text,
 status text not null default 'nova' check(status in ('nova','em_atendimento','convertida','encerrada','cancelada')),
 observacoes_internas text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_solicitacoes_timestamp before update on public.solicitacoes_publicas for each row execute function public.atualizar_timestamp();

create table public.reservas (
 id uuid primary key default extensions.gen_random_uuid(),
 protocolo text not null unique default public.gerar_protocolo('RES'),
 usuario_id uuid references public.usuarios(id) on delete set null,
 servico_id uuid references public.servicos(id) on delete set null,
 solicitacao_id uuid references public.solicitacoes_publicas(id) on delete set null,
 nome_cliente text not null, email_cliente text, whatsapp_cliente text not null,
 data_inicio timestamptz not null, data_fim timestamptz not null,
 quantidade_convidados integer, endereco_evento text, preferencias text, restricoes_alimentares text, mensagem text,
 status text not null default 'solicitada' check(status in ('solicitada','em_analise','orcada','aguardando_aprovacao','aprovada','aguardando_sinal','confirmada','em_realizacao','concluida','remarcacao_solicitada','cancelamento_solicitado','cancelada')),
 tempo_preparacao_minutos integer not null default 0, tempo_deslocamento_minutos integer not null default 0,
 valor_total numeric(10,2) not null default 0, desconto numeric(10,2) not null default 0,
 valor_sinal numeric(10,2) not null default 0, saldo numeric(10,2) not null default 0,
 forma_pagamento text check(forma_pagamento in ('pix','dinheiro')),
 situacao_pagamento text not null default 'pendente' check(situacao_pagamento in ('pendente','parcial','pago','estornado')),
 observacoes_internas text,
 criado_por uuid references public.usuarios(id) on delete set null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz,
 check(data_fim>data_inicio)
);
create index idx_reservas_periodo on public.reservas(data_inicio,data_fim) where excluido_em is null;
create trigger trg_reservas_timestamp before update on public.reservas for each row execute function public.atualizar_timestamp();

create or replace function public.impedir_conflito_reserva()
returns trigger language plpgsql set search_path=public as $$
declare inicio_bloqueado timestamptz; fim_bloqueado timestamptz;
begin
 if new.excluido_em is not null or new.status in ('cancelada','cancelamento_solicitado') then return new; end if;
 inicio_bloqueado:=new.data_inicio-make_interval(mins=>greatest(0,new.tempo_preparacao_minutos+new.tempo_deslocamento_minutos));
 fim_bloqueado:=new.data_fim+make_interval(mins=>greatest(0,new.tempo_deslocamento_minutos));
 if exists(select 1 from public.reservas r where r.id<>new.id and r.excluido_em is null and r.status not in ('cancelada','cancelamento_solicitado')
  and tstzrange(r.data_inicio-make_interval(mins=>greatest(0,r.tempo_preparacao_minutos+r.tempo_deslocamento_minutos)),
                r.data_fim+make_interval(mins=>greatest(0,r.tempo_deslocamento_minutos)),'[)')
      && tstzrange(inicio_bloqueado,fim_bloqueado,'[)')) then
  raise exception 'Conflito de agenda considerando preparação e deslocamento.';
 end if;
 if exists(select 1 from public.bloqueios_agenda b where b.excluido_em is null
  and tstzrange(b.inicio,b.fim,'[)') && tstzrange(inicio_bloqueado,fim_bloqueado,'[)')) then
  raise exception 'O período conflita com um compromisso interno.';
 end if;
 return new;
end $$;
create trigger trg_conflito_reserva before insert or update of data_inicio,data_fim,tempo_preparacao_minutos,tempo_deslocamento_minutos,status on public.reservas for each row execute function public.impedir_conflito_reserva();

create or replace function public.proteger_alteracao_reserva_cliente()
returns trigger language plpgsql set search_path=public as $$
begin
 if public.tipo_usuario_atual()='cliente' and old.usuario_id=auth.uid() then
  if new.status not in ('cancelamento_solicitado','remarcacao_solicitada') then raise exception 'Cliente somente pode solicitar cancelamento ou remarcação.'; end if;
  if (to_jsonb(new)-array['status','atualizado_em'])<>(to_jsonb(old)-array['status','atualizado_em']) then raise exception 'Outros dados não podem ser alterados pelo cliente.'; end if;
 end if;
 return new;
end $$;
create trigger trg_proteger_reserva_cliente before update on public.reservas for each row execute function public.proteger_alteracao_reserva_cliente();

create table public.disponibilidade (
 id uuid primary key default extensions.gen_random_uuid(),
 dia_semana smallint not null check(dia_semana between 0 and 6),
 hora_inicio time not null, hora_fim time not null, ativo boolean not null default true,
 observacao_publica text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz,
 check(hora_fim>hora_inicio)
);
create trigger trg_disponibilidade_timestamp before update on public.disponibilidade for each row execute function public.atualizar_timestamp();

create table public.bloqueios_agenda (
 id uuid primary key default extensions.gen_random_uuid(), titulo text not null,
 inicio timestamptz not null, fim timestamptz not null, motivo text,
 criado_por uuid references public.usuarios(id) on delete set null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz,
 check(fim>inicio)
);
create trigger trg_bloqueios_timestamp before update on public.bloqueios_agenda for each row execute function public.atualizar_timestamp();

create or replace function public.impedir_conflito_bloqueio()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.excluido_em is not null then return new; end if;
 if exists(select 1 from public.reservas r where r.excluido_em is null and r.status not in ('cancelada','cancelamento_solicitado')
  and tstzrange(r.data_inicio-make_interval(mins=>greatest(0,r.tempo_preparacao_minutos+r.tempo_deslocamento_minutos)),
                r.data_fim+make_interval(mins=>greatest(0,r.tempo_deslocamento_minutos)),'[)')
      && tstzrange(new.inicio,new.fim,'[)')) then
  raise exception 'O compromisso interno conflita com uma reserva.';
 end if;
 if exists(select 1 from public.bloqueios_agenda b where b.id<>new.id and b.excluido_em is null
  and tstzrange(b.inicio,b.fim,'[)') && tstzrange(new.inicio,new.fim,'[)')) then
  raise exception 'Já existe outro compromisso interno neste período.';
 end if;
 return new;
end $$;
create trigger trg_conflito_bloqueio before insert or update of inicio,fim,excluido_em on public.bloqueios_agenda for each row execute function public.impedir_conflito_bloqueio();

create view public.disponibilidade_publica as
select id,dia_semana,hora_inicio,hora_fim,observacao_publica
from public.disponibilidade where ativo and excluido_em is null;

create table public.pedidos (
 id uuid primary key default extensions.gen_random_uuid(),
 protocolo text not null unique default public.gerar_protocolo('PED'),
 usuario_id uuid references public.usuarios(id) on delete set null,
 solicitacao_id uuid references public.solicitacoes_publicas(id) on delete set null,
 nome_cliente text not null, email_cliente text, whatsapp_cliente text not null,
 data_pedido date not null default current_date, data_entrega timestamptz,
 modalidade text check(modalidade in ('entrega','retirada')), endereco_entrega text,
 itens jsonb not null default '[]'::jsonb,
 status text not null default 'solicitado' check(status in ('solicitado','em_analise','confirmado','em_preparo','pronto','saiu_para_entrega','entregue','concluido','cancelado')),
 subtotal numeric(10,2) not null default 0, desconto numeric(10,2) not null default 0,
 taxa_entrega numeric(10,2) not null default 0, valor_total numeric(10,2) not null default 0,
 valor_sinal numeric(10,2) not null default 0, saldo numeric(10,2) not null default 0,
 forma_pagamento text check(forma_pagamento in ('pix','dinheiro')),
 situacao_pagamento text not null default 'pendente' check(situacao_pagamento in ('pendente','parcial','pago','estornado')),
 observacoes text, criado_por uuid references public.usuarios(id) on delete set null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_pedidos_timestamp before update on public.pedidos for each row execute function public.atualizar_timestamp();

create table public.pedido_itens (
 id uuid primary key default extensions.gen_random_uuid(),
 pedido_id uuid not null references public.pedidos(id) on delete cascade,
 nome_item text not null, quantidade numeric(10,2) not null default 1,
 preco_unitario_historico numeric(10,2) not null, subtotal numeric(10,2) generated always as (quantidade*preco_unitario_historico) stored,
 observacoes text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_pedido_itens_timestamp before update on public.pedido_itens for each row execute function public.atualizar_timestamp();

create table public.lancamentos_financeiros (
 id uuid primary key default extensions.gen_random_uuid(),
 tipo text not null check(tipo in ('receita','despesa')), categoria text, descricao text not null,
 valor numeric(10,2) not null check(valor>=0), data_lancamento date not null,
 status text not null default 'previsto' check(status in ('previsto','realizado','cancelado')),
 pedido_id uuid references public.pedidos(id) on delete set null,
 reserva_id uuid references public.reservas(id) on delete set null,
 observacoes text, criado_por uuid references public.usuarios(id) on delete set null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_financeiro_timestamp before update on public.lancamentos_financeiros for each row execute function public.atualizar_timestamp();

create table public.publicacoes (
 id uuid primary key default extensions.gen_random_uuid(),
 titulo text not null, slug text not null unique, resumo text, conteudo text not null default '',
 imagem_url text, categoria text, autor_id uuid references public.usuarios(id) on delete set null,
 status text not null default 'rascunho' check(status in ('rascunho','em_revisao','agendada','publicada','arquivada')),
 agendado_para timestamptz, publicado_em timestamptz,
 titulo_seo text, descricao_seo text, palavras_chave text,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_publicacoes_slug before insert or update on public.publicacoes for each row execute function public.preparar_slug_generico();
create trigger trg_publicacoes_timestamp before update on public.publicacoes for each row execute function public.atualizar_timestamp();

create or replace function public.preparar_publicacao()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.status='publicada' and new.publicado_em is null then new.publicado_em=now(); end if;
 if new.status='agendada' and new.agendado_para is null then raise exception 'Informe a data de agendamento.'; end if;
 if new.status='agendada' then new.publicado_em=new.agendado_para; end if;
 return new;
end $$;
create trigger trg_preparar_publicacao before insert or update on public.publicacoes for each row execute function public.preparar_publicacao();


create table public.eventos_publicos (
 id uuid primary key default extensions.gen_random_uuid(),
 titulo text not null, slug text not null unique, resumo text, descricao text,
 imagem_url text, data_inicio timestamptz not null, data_fim timestamptz not null,
 local_publico text, link_inscricao text,
 status text not null default 'rascunho' check(status in ('rascunho','publicado','encerrado','cancelado')),
 criado_por uuid references public.usuarios(id) on delete set null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz,
 check(data_fim>data_inicio)
);
create trigger trg_eventos_slug before insert or update on public.eventos_publicos for each row execute function public.preparar_slug_generico();
create trigger trg_eventos_timestamp before update on public.eventos_publicos for each row execute function public.atualizar_timestamp();

create table public.promocoes (
 id uuid primary key default extensions.gen_random_uuid(), titulo text not null, descricao text, imagem_url text,
 inicio_em timestamptz not null, fim_em timestamptz not null,
 status text not null default 'rascunho' check(status in ('rascunho','ativa','pausada','arquivada')),
 codigo text, desconto_percentual numeric(5,2),
 criado_por uuid references public.usuarios(id) on delete set null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz,
 check(fim_em>inicio_em)
);
create trigger trg_promocoes_timestamp before update on public.promocoes for each row execute function public.atualizar_timestamp();
create view public.promocoes_publicas as
select * from public.promocoes where status='ativa' and now() between inicio_em and fim_em and excluido_em is null;

create table public.parceiros (
 id uuid primary key default extensions.gen_random_uuid(), nome text not null, categoria text, descricao text,
 whatsapp text, instagram text, site text, ordem integer not null default 0, ativo boolean not null default true,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_parceiros_timestamp before update on public.parceiros for each row execute function public.atualizar_timestamp();

create table public.videos (
 id uuid primary key default extensions.gen_random_uuid(), titulo text not null, youtube_url text not null,
 descricao text, ordem integer not null default 0, ativo boolean not null default true,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_videos_timestamp before update on public.videos for each row execute function public.atualizar_timestamp();

create table public.favoritos (
 id uuid primary key default extensions.gen_random_uuid(), usuario_id uuid not null references public.usuarios(id) on delete cascade,
 tipo text not null check(tipo in ('cardapio','servico','publicacao')), referencia_id uuid not null,
 criado_em timestamptz not null default now(), excluido_em timestamptz,
 unique(usuario_id,tipo,referencia_id)
);
create table public.avaliacoes (
 id uuid primary key default extensions.gen_random_uuid(), usuario_id uuid not null references public.usuarios(id) on delete cascade,
 tipo_item text not null check(tipo_item in ('pedido','reserva')), item_id uuid not null,
 nota smallint not null check(nota between 1 and 5), comentario text,
 status text not null default 'publicada' check(status in ('publicada','oculta')),
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz,
 unique(usuario_id,tipo_item,item_id)
);
create trigger trg_avaliacoes_timestamp before update on public.avaliacoes for each row execute function public.atualizar_timestamp();

create or replace function public.validar_avaliacao()
returns trigger language plpgsql security definer set search_path=public as $$
declare valido boolean:=false;
begin
 if new.tipo_item='pedido' then
  select exists(select 1 from public.pedidos where id=new.item_id and usuario_id=new.usuario_id and status='concluido' and situacao_pagamento='pago' and excluido_em is null) into valido;
 else
  select exists(select 1 from public.reservas where id=new.item_id and usuario_id=new.usuario_id and status='concluida' and situacao_pagamento='pago' and excluido_em is null) into valido;
 end if;
 if not valido then raise exception 'Somente pedidos ou reservas próprios, concluídos e pagos podem ser avaliados.'; end if;
 if not public.eh_chef_ou_admin() then new.status='publicada'; end if;
 return new;
end $$;
create trigger trg_validar_avaliacao before insert or update of usuario_id,tipo_item,item_id,nota,comentario on public.avaliacoes for each row execute function public.validar_avaliacao();

create table public.pontos_movimentacoes (
 id uuid primary key default extensions.gen_random_uuid(), usuario_id uuid not null references public.usuarios(id) on delete cascade,
 origem_tipo text not null check(origem_tipo in ('pedido','reserva','recompensa')), origem_id uuid not null,
 pontos integer not null, motivo text not null, criado_em timestamptz not null default now(), excluido_em timestamptz,
 unique(usuario_id,origem_tipo,origem_id)
);
create table public.recompensas (
 id uuid primary key default extensions.gen_random_uuid(), nome text not null, descricao text, pontos_necessarios integer not null check(pontos_necessarios>0),
 ativo boolean not null default true, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_recompensas_timestamp before update on public.recompensas for each row execute function public.atualizar_timestamp();
create table public.resgates_recompensas (
 id uuid primary key default extensions.gen_random_uuid(), usuario_id uuid not null references public.usuarios(id) on delete cascade,
 recompensa_id uuid not null references public.recompensas(id) on delete restrict, pontos_utilizados integer not null,
 status text not null default 'solicitado' check(status in ('solicitado','aprovado','utilizado','cancelado')),
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_resgates_timestamp before update on public.resgates_recompensas for each row execute function public.atualizar_timestamp();

create or replace function public.validar_resgate()
returns trigger language plpgsql security definer set search_path=public as $$
declare custo integer; saldo_atual integer;
begin
 select pontos_necessarios into custo from public.recompensas where id=new.recompensa_id and ativo and excluido_em is null;
 if custo is null then raise exception 'Recompensa indisponível.'; end if;
 new.pontos_utilizados:=custo;
 select coalesce(sum(pontos),0) into saldo_atual from public.pontos_movimentacoes where usuario_id=new.usuario_id and excluido_em is null;
 if saldo_atual<custo then raise exception 'Saldo de pontos insuficiente.'; end if;
 return new;
end $$;
create trigger trg_validar_resgate before insert on public.resgates_recompensas for each row execute function public.validar_resgate();

create or replace function public.reconciliar_resgate()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('aprovado','utilizado') and new.excluido_em is null then
  insert into public.pontos_movimentacoes(usuario_id,origem_tipo,origem_id,pontos,motivo)
  values(new.usuario_id,'recompensa',new.id,-new.pontos_utilizados,'Resgate de recompensa')
  on conflict(usuario_id,origem_tipo,origem_id) do update set pontos=excluded.pontos,motivo=excluded.motivo,excluido_em=null;
 else
  update public.pontos_movimentacoes set excluido_em=now()
  where origem_tipo='recompensa' and origem_id=new.id and excluido_em is null;
 end if;
 return new;
end $$;
create trigger trg_reconciliar_resgate after insert or update of status,excluido_em on public.resgates_recompensas for each row execute function public.reconciliar_resgate();


create or replace function public.reconciliar_pontos()
returns trigger language plpgsql security definer set search_path=public as $$
declare apto boolean; pontos_novos integer; uid uuid; origem text;
begin
 origem:=case when tg_table_name='pedidos' then 'pedido' else 'reserva' end;
 uid:=new.usuario_id; pontos_novos:=case when origem='pedido' then 10 else 20 end;
 apto:=uid is not null and new.situacao_pagamento='pago' and
  ((origem='pedido' and new.status='concluido') or (origem='reserva' and new.status='concluida')) and new.excluido_em is null;
 if apto then
  insert into public.pontos_movimentacoes(usuario_id,origem_tipo,origem_id,pontos,motivo)
  values(uid,origem,new.id,pontos_novos,'Serviço concluído e pago')
  on conflict(usuario_id,origem_tipo,origem_id) do update set pontos=excluded.pontos,motivo=excluded.motivo,excluido_em=null;
 else
  update public.pontos_movimentacoes set excluido_em=now()
  where origem_tipo=origem and origem_id=new.id and excluido_em is null;
 end if;
 return new;
end $$;
create trigger trg_pontos_pedido after insert or update of status,situacao_pagamento,usuario_id,excluido_em on public.pedidos for each row execute function public.reconciliar_pontos();
create trigger trg_pontos_reserva after insert or update of status,situacao_pagamento,usuario_id,excluido_em on public.reservas for each row execute function public.reconciliar_pontos();

create view public.aniversariantes_do_mes with (security_invoker=true) as
select id,nome,nome_exibicao,whatsapp,cidade,extract(day from data_nascimento)::int as dia
from public.usuarios where tipo_usuario='cliente' and status='ativo' and excluido_em is null
 and extract(month from data_nascimento)=extract(month from current_date);

create view public.ranking_clientes as
with base as (
 select u.id,
  concat(left(coalesce(u.nome_exibicao,u.nome),1),'***',right(coalesce(u.nome_exibicao,u.nome),1)) as nome_anonimizado,
  count(p.id) filter(where p.status='concluido' and p.situacao_pagamento='pago' and p.excluido_em is null) as pedidos_finalizados,
  coalesce((select sum(pm.pontos) from public.pontos_movimentacoes pm where pm.usuario_id=u.id and pm.excluido_em is null),0)::int as pontos
 from public.usuarios u left join public.pedidos p on p.usuario_id=u.id
 where u.tipo_usuario='cliente' and u.participa_ranking and u.excluido_em is null
 group by u.id,u.nome_exibicao,u.nome
)
select dense_rank() over(order by pedidos_finalizados desc,pontos desc)::int as posicao,* from base where pedidos_finalizados>0;

create table public.mensagens_modelo (
 id uuid primary key default extensions.gen_random_uuid(), codigo text not null unique, titulo text not null, mensagem text not null,
 ativo boolean not null default true, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_mensagens_timestamp before update on public.mensagens_modelo for each row execute function public.atualizar_timestamp();

create table public.solicitacoes_remocao (
 id uuid primary key default extensions.gen_random_uuid(), protocolo text not null unique default public.gerar_protocolo('REM'),
 tipo text not null check(tipo in ('perfil','publicacao')), nome text not null, email text not null, whatsapp text,
 url_ou_identificador text, justificativa text,
 status text not null default 'aguardando_confirmacao' check(status in ('aguardando_confirmacao','confirmada','em_analise','aprovada','rejeitada','concluida')),
 confirmado_em timestamptz, analisado_por uuid references public.usuarios(id) on delete set null, resposta text,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(), excluido_em timestamptz
);
create trigger trg_remocao_timestamp before update on public.solicitacoes_remocao for each row execute function public.atualizar_timestamp();

create table public.logs_auditoria (
 id bigint generated always as identity primary key, usuario_id uuid, usuario_email text,
 acao text not null, tabela text not null, registro_id text, valores_anteriores jsonb, valores_posteriores jsonb,
 navegador text, criado_em timestamptz not null default now(), excluido_em timestamptz
);
comment on table public.logs_auditoria is 'Auditoria sem endereço IP, conforme decisão do projeto.';

create or replace function public.registrar_auditoria()
returns trigger language plpgsql security definer set search_path=public as $$
declare rid text; anterior jsonb; posterior jsonb;
begin
 anterior:=case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
 posterior:=case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
 rid:=coalesce(posterior->>'id',anterior->>'id');
 insert into public.logs_auditoria(usuario_id,usuario_email,acao,tabela,registro_id,valores_anteriores,valores_posteriores)
 values(auth.uid(),coalesce(auth.jwt()->>'email',current_setting('request.jwt.claim.email',true)),lower(tg_op),tg_table_name,rid,anterior,posterior);
 return coalesce(new,old);
end $$;

do $$
declare t text;
begin
 foreach t in array array['usuarios','servicos','cardapios','solicitacoes_publicas','reservas','pedidos','lancamentos_financeiros','publicacoes','eventos_publicos','promocoes','parceiros','videos','convites','solicitacoes_remocao'] loop
  execute format('create trigger trg_auditoria_%I after insert or update or delete on public.%I for each row execute function public.registrar_auditoria()',t,t);
 end loop;
end $$;

create table public.metricas_site (
 id bigint generated always as identity primary key,
 data_referencia date not null default current_date,
 caminho text not null,
 referenciador text not null default '',
 dispositivo text not null default 'desktop' check(dispositivo in ('desktop','mobile','tablet','outro')),
 visualizacoes bigint not null default 1 check(visualizacoes>0),
 atualizado_em timestamptz not null default now(),
 unique(data_referencia,caminho,referenciador,dispositivo)
);

-- Seeds
insert into public.servicos(nome,slug,categoria,resumo,descricao,imagem_url,preco_visivel,ordem,itens_inclusos,regiao_atendida) values
('Personal Chef','personal-chef','Personal Chef','Uma experiência gastronômica criada para você e preparada em sua casa, com menu personalizado e atenção integral aos detalhes.','O Chef Gil planeja e executa uma experiência sob medida no ambiente do cliente, respeitando preferências, restrições, número de convidados e estilo da ocasião.','assets/img/personal-chef.svg',false,1,'Planejamento, menu personalizado, preparo e organização conforme proposta.','Distrito Federal e municípios próximos em raio de até 100 km.'),
('Marmitas e congelados','marmitas-e-congelados','Marmitas','Praticidade para todos os dias, com receitas afetivas, ingredientes selecionados e sabor de comida feita com cuidado.','Opções congeladas para a rotina, produzidas com organização, equilíbrio e identidade caseira, mediante disponibilidade e encomenda.','assets/img/marmitas.svg',false,2,'Produção, embalagem e orientações de conservação conforme o pedido.','Distrito Federal e regiões atendidas.'),
('Buffet e eventos','buffet-e-eventos','Buffet','Apresentação elegante e serviço sob medida para cafés, almoços, aniversários, encontros sociais e eventos corporativos.','Propostas personalizadas para diferentes formatos, da recepção ao serviço principal, sempre adequadas ao espaço, aos convidados e ao orçamento.','assets/img/buffet.svg',false,3,'Planejamento do serviço, cardápio, apresentação e execução conforme proposta.','Distrito Federal e municípios próximos em raio de até 100 km.');

insert into public.disponibilidade(dia_semana,hora_inicio,hora_fim,observacao_publica)
select d,'08:00','20:00','Horários sujeitos à confirmação e ao tempo de deslocamento.' from generate_series(1,6) d;

insert into public.mensagens_modelo(codigo,titulo,mensagem) values
('orcamento_recebido','Orçamento recebido','Olá, {nome}! Sua solicitação {protocolo} foi recebida pelo Gil Personal Chef. Em breve continuaremos o atendimento.'),
('orcamento_aprovado','Orçamento aprovado','Olá, {nome}! O orçamento {protocolo} foi aprovado. Vamos alinhar o sinal e confirmar sua experiência.'),
('pedido_status','Atualização do pedido','Olá, {nome}! Seu pedido {protocolo} agora está com o status: {status}.'),
('aniversario','Feliz aniversário','Feliz aniversário, {nome}! O Gil Personal Chef deseja um novo ciclo repleto de alegrias e bons encontros.'),
('convite','Convite de acesso','Olá, {nome}! Você recebeu um convite para acessar o Gil Personal Chef. O link expira em 30 dias: {link}');


-- Convites: limpeza de telefone, expiração automática e e-mail normalizado
create or replace function public.preparar_convite()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare papel_atual text:=public.tipo_usuario_atual();
begin
 new.email=lower(trim(new.email));
 new.whatsapp=public.somente_digitos(new.whatsapp);
 if new.whatsapp !~ '^55[0-9]{10,11}$' then raise exception 'WhatsApp deve conter país 55, DDD e número.'; end if;
 if tg_op='INSERT' or new.tipo_usuario is distinct from old.tipo_usuario or (new.status='pendente' and old.status<>'pendente') then
  if new.tipo_usuario='administrador' and papel_atual<>'administrador' and auth.role()<>'service_role' and current_user not in ('postgres','supabase_admin') then
   raise exception 'Somente o administrador pode emitir convite administrativo.';
  end if;
  if new.tipo_usuario='administrador' and exists(select 1 from public.usuarios where tipo_usuario='administrador' and excluido_em is null) then
   raise exception 'Já existe um administrador ativo.';
  end if;
  if new.tipo_usuario='chef' and exists(select 1 from public.usuarios where tipo_usuario='chef' and excluido_em is null) then
   raise exception 'Já existe um Chef ativo.';
  end if;
 end if;
 if new.expira_em is null then new.expira_em=now()+interval '30 days'; end if;
 if new.token is null or new.token='' then new.token=encode(extensions.gen_random_bytes(24),'hex'); end if;
 new.atualizado_em=now();
 return new;
end $$;
drop trigger if exists trg_preparar_convite on public.convites;
create trigger trg_preparar_convite before insert or update on public.convites for each row execute function public.preparar_convite();

-- Consulta segura de convite pelo token secreto, sem liberar a tabela de convites.
create or replace function public.consultar_convite_publico(p_token text)
returns table(valido boolean,nome text,email text,whatsapp text,tipo_usuario text,expira_em timestamptz,mensagem text)
language plpgsql security definer set search_path=public as $$
declare convite public.convites%rowtype;
begin
 select * into convite from public.convites
 where token=p_token and status='pendente' and excluido_em is null limit 1;
 if not found then
  return query select false,null::text,null::text,null::text,null::text,null::timestamptz,'Convite não encontrado.'::text; return;
 end if;
 if convite.expira_em<=now() then
  update public.convites set status='expirado' where id=convite.id;
  return query select false,null::text,null::text,null::text,null::text,convite.expira_em,'Convite expirado.'::text; return;
 end if;
 return query select true,convite.nome,convite.email,convite.whatsapp,convite.tipo_usuario,convite.expira_em,'Convite válido.'::text;
end $$;

-- Formulário público: salva primeiro no banco e retorna protocolo para continuidade no WhatsApp.
create or replace function public.registrar_solicitacao_publica(
 p_tipo text,
 p_nome text,
 p_email text default null,
 p_whatsapp text default null,
 p_servico_interesse text default null,
 p_data_desejada date default null,
 p_quantidade_convidados integer default null,
 p_mensagem text default null,
 p_dados_adicionais jsonb default '{}'::jsonb,
 p_origem text default null
)
returns table(id uuid,protocolo text)
language plpgsql security definer set search_path=public,extensions as $$
declare novo_id uuid; novo_protocolo text; telefone text;
begin
 if p_tipo not in ('orcamento','encomenda','contato') then raise exception 'Tipo de solicitação inválido.'; end if;
 if nullif(trim(p_nome),'') is null then raise exception 'Informe o nome.'; end if;
 telefone:=public.somente_digitos(p_whatsapp);
 if telefone !~ '^55[0-9]{10,11}$' then raise exception 'Informe um WhatsApp brasileiro com DDI 55.'; end if;
 insert into public.solicitacoes_publicas(tipo,nome,email,whatsapp,servico_interesse,data_desejada,quantidade_convidados,mensagem,dados_adicionais,origem)
 values(p_tipo,trim(p_nome),nullif(lower(trim(p_email)),''),telefone,nullif(trim(p_servico_interesse),''),p_data_desejada,p_quantidade_convidados,nullif(trim(p_mensagem),''),coalesce(p_dados_adicionais,'{}'::jsonb),left(coalesce(p_origem,''),500))
 returning solicitacoes_publicas.id,solicitacoes_publicas.protocolo into novo_id,novo_protocolo;
 return query select novo_id,novo_protocolo;
end $$;

-- Solicitação pública de remoção com protocolo e análise humana obrigatória.
create or replace function public.registrar_solicitacao_remocao(
 p_tipo text,
 p_nome text,
 p_email text,
 p_whatsapp text default null,
 p_url_conteudo text default null,
 p_motivo text default null
)
returns table(id uuid,protocolo text)
language plpgsql security definer set search_path=public as $$
declare novo_id uuid; novo_protocolo text; telefone text;
begin
 if p_tipo not in ('perfil','publicacao') then raise exception 'Tipo de remoção inválido.'; end if;
 if nullif(trim(p_nome),'') is null or nullif(trim(p_email),'') is null then raise exception 'Nome e e-mail são obrigatórios.'; end if;
 telefone:=nullif(public.somente_digitos(p_whatsapp),'');
 if telefone is not null and telefone !~ '^55[0-9]{10,11}$' then raise exception 'WhatsApp inválido.'; end if;
 insert into public.solicitacoes_remocao(tipo,nome,email,whatsapp,url_ou_identificador,justificativa)
 values(p_tipo,trim(p_nome),lower(trim(p_email)),telefone,nullif(trim(p_url_conteudo),''),nullif(trim(p_motivo),''))
 returning solicitacoes_remocao.id,solicitacoes_remocao.protocolo into novo_id,novo_protocolo;
 return query select novo_id,novo_protocolo;
end $$;

-- Consulta pública sem revelar cliente, endereço ou compromisso.
create or replace function public.consultar_disponibilidade_publica(p_inicio timestamptz,p_fim timestamptz)
returns table(disponivel boolean,motivo text)
language plpgsql security definer set search_path=public as $$
declare d integer; h_inicio time; h_fim time; regra_ok boolean;
begin
 if p_inicio is null or p_fim is null or p_fim<=p_inicio then
  return query select false,'Período inválido.'::text; return;
 end if;
 if p_inicio<now() then return query select false,'Escolha uma data futura.'::text; return; end if;
 d:=extract(dow from p_inicio)::integer; h_inicio:=p_inicio::time; h_fim:=p_fim::time;
 select exists(select 1 from public.disponibilidade where dia_semana=d and ativo and excluido_em is null and h_inicio>=hora_inicio and h_fim<=hora_fim) into regra_ok;
 if not regra_ok then return query select false,'O período está fora dos horários configurados.'::text; return; end if;
 if exists(select 1 from public.reservas where excluido_em is null and status not in ('cancelada','cancelamento_solicitado') and tstzrange(data_inicio-make_interval(mins=>greatest(0,tempo_preparacao_minutos+tempo_deslocamento_minutos)),data_fim+make_interval(mins=>greatest(0,tempo_deslocamento_minutos)),'[)') && tstzrange(p_inicio,p_fim,'[)'))
 or exists(select 1 from public.bloqueios_agenda where excluido_em is null and tstzrange(inicio,fim,'[)') && tstzrange(p_inicio,p_fim,'[)')) then
  return query select false,'Já existe compromisso neste período. Escolha outro horário.'::text; return;
 end if;
 return query select true,'Período potencialmente disponível. A confirmação ocorre após análise do Chef.'::text;
end $$;

-- Métricas agregadas, sem cookies, IP ou identificador individual.
create or replace function public.registrar_metrica_publica(p_caminho text,p_referenciador text default null,p_dispositivo text default 'desktop')
returns void language plpgsql security definer set search_path=public as $$
declare dispositivo_normalizado text;
begin
 dispositivo_normalizado:=case when p_dispositivo in ('desktop','mobile','tablet','outro') then p_dispositivo else 'outro' end;
 insert into public.metricas_site(data_referencia,caminho,referenciador,dispositivo,visualizacoes)
 values(current_date,left(coalesce(nullif(p_caminho,''),'/'),300),coalesce(left(nullif(p_referenciador,''),200),''),dispositivo_normalizado,1)
 on conflict(data_referencia,caminho,referenciador,dispositivo)
 do update set visualizacoes=public.metricas_site.visualizacoes+1,atualizado_em=now();
end $$;

-- RLS
alter table public.usuarios enable row level security;
alter table public.configuracoes_sistema enable row level security;
alter table public.servicos enable row level security;
alter table public.cardapios enable row level security;
alter table public.solicitacoes_publicas enable row level security;
alter table public.reservas enable row level security;
alter table public.disponibilidade enable row level security;
alter table public.bloqueios_agenda enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.lancamentos_financeiros enable row level security;
alter table public.publicacoes enable row level security;
alter table public.eventos_publicos enable row level security;
alter table public.promocoes enable row level security;
alter table public.parceiros enable row level security;
alter table public.videos enable row level security;
alter table public.favoritos enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.pontos_movimentacoes enable row level security;
alter table public.recompensas enable row level security;
alter table public.resgates_recompensas enable row level security;
alter table public.convites enable row level security;
alter table public.mensagens_modelo enable row level security;
alter table public.solicitacoes_remocao enable row level security;
alter table public.logs_auditoria enable row level security;
alter table public.metricas_site enable row level security;

create policy usuarios_ler on public.usuarios for select to authenticated using(id=auth.uid() or public.eh_equipe());
create policy usuarios_atualizar on public.usuarios for update to authenticated
 using(id=auth.uid() or public.eh_chef_ou_admin() or (public.eh_assistente() and tipo_usuario='cliente'))
 with check(id=auth.uid() or public.eh_chef_ou_admin() or (public.eh_assistente() and tipo_usuario='cliente'));
create policy usuarios_inserir_equipe on public.usuarios for insert to authenticated with check(public.eh_chef_ou_admin());

create policy config_ler_chef_admin on public.configuracoes_sistema for select to authenticated using(public.eh_chef_ou_admin());
create policy config_editar_admin on public.configuracoes_sistema for update to authenticated using(public.eh_administrador()) with check(public.eh_administrador());

create policy servicos_publicos on public.servicos for select to anon,authenticated using((ativo and excluido_em is null) or public.eh_chef_ou_admin());
create policy servicos_gerir on public.servicos for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());
create policy cardapios_publicos on public.cardapios for select to anon,authenticated using((ativo and excluido_em is null) or public.eh_chef_ou_admin());
create policy cardapios_gerir on public.cardapios for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());

create policy solicitacoes_equipe on public.solicitacoes_publicas for all to authenticated using(public.eh_equipe()) with check(public.eh_equipe());
create policy reservas_ler on public.reservas for select to authenticated using(usuario_id=auth.uid() or public.eh_equipe());
create policy reservas_equipe_inserir on public.reservas for insert to authenticated with check(public.eh_equipe());
create policy reservas_atualizar on public.reservas for update to authenticated using(usuario_id=auth.uid() or public.eh_equipe()) with check(usuario_id=auth.uid() or public.eh_equipe());
create policy disponibilidade_publica on public.disponibilidade for select to anon,authenticated using((ativo and excluido_em is null) or public.eh_equipe());
create policy disponibilidade_gerir on public.disponibilidade for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());
create policy bloqueios_equipe on public.bloqueios_agenda for all to authenticated using(public.eh_equipe()) with check(public.eh_equipe());

create policy pedidos_ler on public.pedidos for select to authenticated using(usuario_id=auth.uid() or public.eh_equipe());
create policy pedidos_equipe on public.pedidos for all to authenticated using(public.eh_equipe()) with check(public.eh_equipe());
create policy pedido_itens_ler on public.pedido_itens for select to authenticated using(
 public.eh_equipe() or exists(select 1 from public.pedidos p where p.id=pedido_id and p.usuario_id=auth.uid()));
create policy pedido_itens_equipe on public.pedido_itens for all to authenticated using(public.eh_equipe()) with check(public.eh_equipe());
create policy financeiro_chef_admin on public.lancamentos_financeiros for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());

create policy publicacoes_publicas on public.publicacoes for select to anon,authenticated using(
 ((status='publicada' and coalesce(publicado_em,criado_em)<=now()) or (status='agendada' and agendado_para<=now())) and excluido_em is null or public.eh_chef_ou_admin());
create policy publicacoes_gerir on public.publicacoes for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());
create policy eventos_publicos_ler on public.eventos_publicos for select to anon,authenticated using(
 (status='publicado' and excluido_em is null) or public.eh_chef_ou_admin());
create policy eventos_publicos_gerir on public.eventos_publicos for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());
create policy promocoes_publicas on public.promocoes for select to anon,authenticated using(
 (status='ativa' and now() between inicio_em and fim_em and excluido_em is null) or public.eh_chef_ou_admin());
create policy promocoes_gerir on public.promocoes for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());
create policy parceiros_publicos on public.parceiros for select to anon,authenticated using((ativo and excluido_em is null) or public.eh_chef_ou_admin());
create policy parceiros_gerir on public.parceiros for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());
create policy videos_publicos on public.videos for select to anon,authenticated using((ativo and excluido_em is null) or public.eh_chef_ou_admin());
create policy videos_gerir on public.videos for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());

create policy favoritos_proprios on public.favoritos for all to authenticated using(usuario_id=auth.uid()) with check(usuario_id=auth.uid());
create policy avaliacoes_ler on public.avaliacoes for select to authenticated using(usuario_id=auth.uid() or public.eh_equipe());
create policy avaliacoes_criar on public.avaliacoes for insert to authenticated with check(usuario_id=auth.uid());
create policy avaliacoes_editar on public.avaliacoes for update to authenticated using(usuario_id=auth.uid() or public.eh_chef_ou_admin()) with check(usuario_id=auth.uid() or public.eh_chef_ou_admin());
create policy pontos_ler on public.pontos_movimentacoes for select to authenticated using(usuario_id=auth.uid() or public.eh_chef_ou_admin());
create policy recompensas_ler on public.recompensas for select to authenticated using((ativo and excluido_em is null) or public.eh_chef_ou_admin());
create policy recompensas_gerir on public.recompensas for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());
create policy resgates_ler on public.resgates_recompensas for select to authenticated using(usuario_id=auth.uid() or public.eh_chef_ou_admin());
create policy resgates_criar on public.resgates_recompensas for insert to authenticated with check(usuario_id=auth.uid());
create policy resgates_gerir on public.resgates_recompensas for update to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());

create policy convites_ler on public.convites for select to authenticated using(public.eh_chef_ou_admin());
create policy convites_gerir on public.convites for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());
create policy mensagens_ler on public.mensagens_modelo for select to authenticated using(public.eh_equipe());
create policy mensagens_gerir on public.mensagens_modelo for all to authenticated using(public.eh_chef_ou_admin()) with check(public.eh_chef_ou_admin());
create policy remocoes_admin on public.solicitacoes_remocao for all to authenticated using(public.eh_administrador()) with check(public.eh_administrador());
create policy logs_admin on public.logs_auditoria for select to authenticated using(public.eh_administrador());
create policy logs_login_proprio on public.logs_auditoria for insert to authenticated with check(usuario_id=auth.uid() and tabela='autenticacao');
create policy metricas_admin on public.metricas_site for select to authenticated using(public.eh_administrador());

-- Privilégios de views e tabelas
grant usage on schema public to anon,authenticated;
grant execute on function public.consultar_convite_publico(text) to anon,authenticated;
grant execute on function public.registrar_solicitacao_publica(text,text,text,text,text,date,integer,text,jsonb,text) to anon,authenticated;
grant execute on function public.registrar_solicitacao_remocao(text,text,text,text,text,text) to anon,authenticated;
grant execute on function public.consultar_disponibilidade_publica(timestamptz,timestamptz) to anon,authenticated;
grant execute on function public.registrar_metrica_publica(text,text,text) to anon,authenticated;
grant execute on function public.tipo_usuario_atual() to authenticated;
grant execute on function public.eh_administrador() to authenticated;
grant execute on function public.eh_chef() to authenticated;
grant execute on function public.eh_assistente() to authenticated;
grant execute on function public.eh_equipe() to authenticated;
grant execute on function public.eh_chef_ou_admin() to authenticated;
grant select on public.configuracoes_publicas,public.disponibilidade_publica,public.promocoes_publicas to anon,authenticated;
grant select on public.ranking_clientes to authenticated;
grant select on public.aniversariantes_do_mes to authenticated;
grant select on public.servicos,public.cardapios,public.publicacoes,public.eventos_publicos,public.promocoes,public.parceiros,public.videos,public.disponibilidade to anon,authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;

-- Storage para imagens oficiais e conteúdo
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('midias','midias',true,8388608,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "midias_publicas" on storage.objects;
drop policy if exists "equipe_gerencia_midias" on storage.objects;
create policy "midias_publicas" on storage.objects for select to anon,authenticated using(bucket_id='midias');
create policy "equipe_gerencia_midias" on storage.objects for all to authenticated
 using(bucket_id='midias' and public.eh_chef_ou_admin())
 with check(bucket_id='midias' and public.eh_chef_ou_admin());

commit;

-- PASSO MANUAL APÓS O PRIMEIRO CADASTRO:
-- 1) Cadastre a conta principal pelo site.
-- 2) Execute, substituindo o e-mail:
-- update public.usuarios
-- set tipo_usuario='administrador', eh_superadministrador=true
-- where email='SEU_EMAIL_ADMINISTRADOR';
--
-- 3) Em Authentication > URL Configuration, configure:
-- Site URL: https://chefgil.com.br
-- Redirect URLs: https://chefgil.com.br/redefinir-senha.html e o endereço do GitHub Pages durante a implantação.
