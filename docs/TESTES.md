# Plano de testes

## Site público

1. Abrir todas as páginas pelo endereço do GitHub Pages e pelo domínio.
2. Confirmar navegação desktop e mobile.
3. Validar a foto oficial do Chef e o símbolo da marca.
4. Testar serviços, cardápios, blog, promoções, eventos e vídeos sem dados e com dados cadastrados.
5. Enviar orçamento, encomenda e contato; confirmar protocolo no banco antes da abertura do WhatsApp.
6. Consultar período disponível e indisponível.

## Autenticação

1. Cadastro público de cliente maior de 18 anos.
2. Rejeição de data inválida e menor de idade.
3. Confirmação de e-mail, login, logout e recuperação de senha.
4. Bloqueio local de 30 segundos após cinco falhas seguidas.
5. Convite válido, expirado, cancelado e reativado.
6. Convites de assistente e Chef sem exigir nascimento.

## Perfis e permissões

1. Cliente não acessa páginas operacionais.
2. Assistente acessa agenda, solicitações, reservas, pedidos e clientes, sem configurações, usuários ou logs.
3. Chef acessa operação e conteúdo, sem configurações críticas, logs ou remoções.
4. Administrador acessa todas as áreas.
5. Apenas um Chef e um administrador podem permanecer ativos.

## Agenda

1. Criar disponibilidade semanal.
2. Criar reserva com início e fim.
3. Validar conflito com outra reserva.
4. Validar preparação e deslocamento.
5. Validar conflito com compromisso interno.
6. Cancelar e remarcar conforme o fluxo.

## Pedidos e financeiro

1. Criar pedido com itens e preços históricos.
2. Percorrer todos os status.
3. Registrar Pix, dinheiro, sinal, saldo e desconto.
4. Gerar QR Code Pix estático.
5. Concluir e pagar pedido/reserva; confirmar pontuação única.
6. Estornar ou cancelar; confirmar retirada dos pontos.

## Conteúdo e relacionamento

1. Criar, revisar, agendar, publicar e arquivar artigo.
2. Favoritar serviço, cardápio e publicação com cliente logado.
3. Avaliar apenas pedido ou reserva própria, concluída e paga.
4. Confirmar ranking anonimizado e recompensas.
5. Testar aniversariante somente no dia correto.

## LGPD e remoção

1. Enviar solicitação pública e confirmar protocolo.
2. Verificar que nenhum visitante remove conteúdo diretamente.
3. Confirmar identidade fora do sistema e aprovar no painel.
4. Implantar a Edge Function.
5. Processar publicação e perfil com conta superadministradora.
6. Confirmar anonimização, remoção no Auth e preservação do protocolo.

## Segurança

1. Confirmar RLS ativa em todas as tabelas.
2. Testar chamadas anônimas permitidas somente às RPCs públicas.
3. Confirmar ausência de `service_role` e segredos no repositório.
4. Verificar logs apenas como administrador.
5. Confirmar que endereços, alergias e restrições não aparecem publicamente.
