# Neon Play — Damas online com Google

Versão fictícia, sem dinheiro real. Esta versão usa somente login Google, Damas online e chat interativo público.

## Funcionalidades
- Login obrigatório com Supabase Auth Google OAuth (já configurado neste projeto).
- Cada ID de usuário Google tem exatamente um perfil de Damas, vinculado na tabela public.neon_damas_google_links.
- Ao criar o perfil, o servidor concede **1.000 créditos fictícios** uma única vez. Sessões repetidas não reiniciam saldo; zerar o armazenamento do navegador não cria novos créditos.
- A Edge Function neon-damas-google valida o JWT consultando auth/v1/user e usa RPCs internas com sessão secreta que nunca vai para o navegador.
- Partidas e créditos validados no banco por neon_damas_action e neon_damas_lobby: publicar/aceitar/cancelar, movimentos obrigatórios, empates, desistência e vitória por ausência. Cada jogador oferece créditos fictícios; os dois aportam o mesmo valor e vencedor recebe a soma.
- Chat público: tabela neon_damas_chat_messages, RLS exige usuário Google, atualizações via Supabase Realtime e busca periódica.
- Sem Mercado Pago, PagBank, Pix, saques, depósitos, conversão em reais ou outros jogos.
- Funções legadas neon-damas, neon-wallet-demo e neon-pagbank-sandbox respondem 410 (encerradas).
- Tabelas antigas mantidas para preservar histórico; saldos de perfis antigos anônimos zerados.
- Front-end hospedado temporariamente no preview GitHub RawGitHack, no ramo neon-play-teste. Recomendado publicar em domínio HTTPS próprio.

## Segurança
- Google autentica no Supabase; nunca enviar client secret, token interno da partida ou chave service_role ao navegador.
- RPC de bootstrap disponível apenas para service_role; SQL e tabelas protegidas por RLS, com operações de jogo validadas no servidor.
- Chat é público entre usuários Google; não compartilhar informações pessoais no chat.
- Créditos são virtuais, não são ativos financeiros e não possuem resgate ou pagamento.

## Testes
GitHub Actions: .github/workflows/neon-damas-google-smoke.yml.
Testa sintaxe JS, IDs do HTML, login obrigatório, API de status, bloqueio de acesso sem Google, desativação dos endpoints financeiros e preview via HTTPS.
O fluxo de uma partida entre duas contas Google requer verificação manual com dois celulares/navegadores.
