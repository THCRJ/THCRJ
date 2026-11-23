# Neon Play — Mercado Pago Pix (plano de homologação)

**Estado atual:** `AGUARDANDO_APROVACAO`. Nenhuma cobrança Pix, depósito financeiro, conversão de créditos virtuais em dinheiro ou saque real está habilitada.

## Contexto comercial

O Neon Play possui damas entre dois jogadores, com créditos disputados entre eles. A intenção de transformar os créditos comprados em saldos resgatáveis significa **pagamentos relacionados a competições com prêmio financeiro** — **não** uma simples venda de créditos de entretenimento não resgatáveis.

Antes de qualquer processamento financeiro:
1. Obter análise jurídica atual para o enquadramento do serviço no Brasil (incluindo eventuais exigências de habilitação).
2. Solicitar **aprovação expressa e documentada do Mercado Pago** para: compra de créditos, partidas com disputa do saldo e possibilidade de saque dos ganhos; esclarecer que também existem outros jogos na plataforma.
3. Confirmar se recebimentos de **R$ 0,10** são suportados na modalidade específica de Checkout utilizada, e tarifas, saldos mínimos e condições de transferência.
4. Validar requisitos de identificação dos jogadores, idade mínima, combate à fraude, multi-contas e conluio, limites, prevenção à lavagem de dinheiro e medidas de jogo responsável.
5. Confirmar se o provedor oferece e autoriza o fluxo de pagamentos de prêmios/saques; não usar estorno de compras para realizar pagamento de prêmio.

## Projeto de integração após aprovação

Fluxo pretendido (não implementado):
1. Jogador autenticado e verificado solicita compra. Backend valida valor e cria pedido `pending` em centavos; usa um identificador único e controle de idempotência.
2. Backend chama a API aprovada do Mercado Pago com credenciais **somente no servidor** e exibe QR Code/Copia e Cola retornados. Não receber nem expor Access Token no navegador, GitHub ou mensagens.
3. Recebe Webhook; verifica a assinatura conforme a modalidade escolhida, consulta status do pagamento diretamente na API do Mercado Pago e reconcilia ID, recebedor, valor e referência interna.
4. Somente um status definitivo de pagamento aprovado, conciliado e idempotente gera crédito numa **carteira financeira separada** dos créditos virtuais do jogo. Nem o navegador nem o webhook isolado podem aumentar saldo.
5. Movimentações de depósito, apostas, vitórias, devoluções, estornos e saques exigem livro-razão imutável ou lançamentos contábeis rastreáveis, bloqueios atômicos, trilhas de auditoria e tratamento de pagamentos duplicados e chargebacks.
6. Saques devem passar por verificação de identidade e antifraude, somente após autorização do meio de pagamento e enquadramento aplicável. Não fazer transferências automáticas sem os controles necessários.

## Segurança e implantação

- Credenciais `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` devem ficar em secrets do backend **somente após aprovação**.
- Nunca processar saque com base apenas no valor exibido no frontend ou saldo `localStorage`.
- Requisitos de implantação: segregação completa dos bancos e tabelas de THCell, MasterCell, GardenCell e ViaCity; testes isolados e ambiente de homologação.
- Testes antes de produção: status pendente, aprovado, expirado, cancelado, contestado; reenvio de Webhooks; corridas concorrentes; reversão; impossibilidade de saldo negativo.
- Modo atual intencionalmente não produz QR válido, charge, credita saldo financeiro ou realiza PIX.

## Referências técnicas oficiais

- [Mercado Pago Developers — Pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/websites/pix)
- [Mercado Pago Developers — notificações de pagamento](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications)
- [Ministério da Fazenda — modalidades de jogos que não são quota fixa](https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/apostas-de-quota-fixa/questoes-tecnicas/quais-tipos-de-jogos-on-line)
