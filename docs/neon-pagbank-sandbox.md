# Neon Play — PagBank (Sandbox, sem dinheiro real)

**Estado:** integração técnica de testes implantada. **Não há cobrança, saque ou prêmio real habilitado.**

## Recursos já implementados
- Interface na aba **Carteira**: compra e venda de créditos demonstrativos, saldo e histórico independentes dos jogos.
- Serviço de carteira `neon-wallet-demo`: saldos de **simulação**; compra e venda *não* criam cobranças nem Pix.
- Serviço `neon-pagbank-sandbox`: consulta da configuração; preparo de cobranças de teste por `POST https://sandbox.api.pagseguro.com/orders`; leitura de status com `GET /orders/{id}`; conferência do identificador, valor e método de pagamento.
- Uma tabela `neon_pagbank_sandbox_orders` independente para acompanhar as cobranças de homologação.
- O QR Pix só pode ser solicitado com token de **sandbox**, uma carteira de teste válida e a chave `PAGBANK_SANDBOX_ENABLED=true`. Atualmente o modo fica desligado sem a configuração.
- Mesmo se uma cobrança de teste constar `PAID`, **nenhum crédito real ou demonstrativo é adicionado pela resposta do PagBank**. A integração não envia Webhooks ou Pix reais.

## O que é necessário para concluir a homologação
1. Criar/acessar conta no [Portal do Desenvolvedor PagBank](https://portaldev.pagbank.com.br/) e localizar o token da aba **Tokens** do **Sandbox**.
2. Configurar o token como secret `PAGBANK_SANDBOX_TOKEN` no projeto Supabase do Neon Play. **Não publicar o token em GitHub, HTML, JavaScript público ou neste chat.**
3. Antes de habilitar `PAGBANK_SANDBOX_ENABLED=true` para testes abertos a visitantes, adicionar autenticação real para usuários e mitigação de abuso. O login anônimo atual é **somente demonstração**.
4. Verificar dados de homologação e as condições de geração de QR Pix de baixo valor (por exemplo, R$ 0,10). Documentação não garante que esse limite seja aceito.
5. Implementar verificação de notificação (Webhook) e conciliação oficial com PagBank **somente após habilitação e revisão de segurança**, mantendo idempotência e reconciliação antes de contabilizar depósitos.
6. Para **venda de créditos com envio de Pix ao jogador**, a API de Transferências/Pix Bacen é um serviço separado, sujeito a Connect, credenciais e **mTLS**, homologação e autorizações necessárias. Nenhuma transferência Pix está configurada.
7. Antes de operar com dinheiro real, obter análise e aprovação para o uso de créditos **resgatáveis** que também podem circular na plataforma de jogos. Trocar o provedor ou chamar o saldo de 'carteira independente' não remove essa questão.

## Segurança
- Não adicionar tokens de produção ou implementar chave de pagamento em código do navegador.
- Não usar a chave Pix pessoal como substituto de uma cobrança conciliada.
- Não converter simulações em pedidos reais, nem utilizar estorno como método de retirada de ganhos.
- O serviço no servidor contém **somente a URL sandbox**; não tem acesso ao endereço de produção.
- As tabelas têm RLS ativo e acesso negado a `anon` e `authenticated`.
- **Não usar** saldo de demonstração como saldo financeiro.

## Endpoints de teste já publicados
- `GET https://plcyaarsfzmjoqkbqlid.supabase.co/functions/v1/neon-pagbank-sandbox`: disponibilidade da conexão (sem credenciais).
- `POST .../neon-pagbank-sandbox` com ação `quote`: cotação de teste para uma carteira autenticada.
- `POST ...` com `create_test_pix`: somente com secrets do Sandbox habilitados.
- `POST ...` com `check_test_pix`: consulta um pedido de teste do próprio jogador.
- `POST ...` com `history`: histórico de pedidos sandbox do próprio jogador.

## Documentação oficial
- [Criar pedido Pix](https://developer.pagbank.com.br/reference/criar-pedido-com-qr-code-pix-v2)
- [Webhooks](https://developer.pagbank.com.br/reference/webhooks)
- [Ambientes disponíveis](https://developer.pagbank.com.br/docs/ambientes-disponiveis)
- [Homologação](https://developer.pagbank.com.br/docs/solicitar-homologacao)
- [Certificados mTLS](https://developer.pagbank.com.br/docs/certificado-digital)
