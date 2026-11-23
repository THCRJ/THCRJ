# Neon Play — Google e PagBank
Esta versão é pré-produção. Os jogos estão livres de apostas; dinheiro real desativado.

## Para configurar Google
- Supabase > Authentication > Sign In / Providers > Google: habilitar com Client ID e Client Secret de um aplicativo Web criado no Google Cloud.
- Google Cloud OAuth (Authorized redirect URI): https://plcyaarsfzmjoqkbqlid.supabase.co/auth/v1/callback
- Supabase > Authentication > URL Configuration > Redirect URLs: incluir a URL HTTPS exata da implantação usada. No preview do ramo: https://raw.githack.com/THCRJ/THCRJ/neon-play-teste/index.html
- No Android, o botão apresenta o fluxo da conta Google do navegador; não pode usar uma conta específica sem autorização do titular.
- Não compartilhar client secret, tokens de sessão nem o token PagBank em mensagens ou GitHub.

## Arquitetura
- public.neon_real_wallet_accounts contém apenas BRL em centavos (saldo inicial zero), políticas RLS para usuários Google e insert restrito a zero.
- PagBank foi escolhido como único provedor futuro. Sandbox não é produção e nunca deve alterar saldo real.
- Nenhum pagamento, saque, webhook financeiro ou aposta real é executado.
- O serviço de damas com apostas em créditos foi retirado até reimplementação com identidade Google e sem apostas.
- Legislação brasileira atual, MP 1.394/2026, bem como autorização do PagBank para uso específico, exigem revisão jurídica antes de qualquer ativação.
