# Pagamento, frete e e-mail — onde plugar os serviços reais

Hoje a loja vai até **"Pedido criado · aguardando pagamento"** sem cobrar nada. Cada serviço
externo fica atrás de uma interface; trocar o fornecedor é escrever uma classe e mudar
**uma linha** no `index.ts` da pasta.

## Fluxo do pedido (já pronto)

1. `POST /checkout/quote` — recalcula itens, cupom, CEP (ViaCEP no servidor) e frete.
2. `POST /orders` (header `Idempotency-Key` obrigatório):
   - recalcula tudo no servidor (preço, desconto progressivo, cupom, frete, Pix);
   - numa transação: cria o pedido **Aguardando pagamento**, reserva o estoque
     (`UPDATE … WHERE stock >= qtd`) e consome o cupom (com limite de usos);
   - chama `paymentProvider.criarCobranca()` e guarda `paymentRef` + `paymentPayload`;
   - envia o e-mail de confirmação.
3. O gateway avisa o pagamento em `POST /payments/webhook/{provider}` → pedido vira **Pago**.
4. Sem pagamento no prazo, o job `expire-orders` cancela e **devolve o estoque**
   (Pix/cartão: `ORDER_RESERVATION_MINUTES`, padrão 60 min; boleto: `BOLETO_RESERVATION_HOURS`, padrão 72 h).

## Pagamento — `api/src/providers/payment/`

| Arquivo | Papel |
|---|---|
| `PaymentProvider.ts` | contrato: `criarCobranca`, `consultarStatus`, `processarWebhook` |
| `MockPaymentProvider.ts` | simulado (atual) |
| `index.ts` | **ponto de troca** |

Para ligar o gateway (Mercado Pago, Pagar.me, Asaas, Stripe…):

1. Crie `XPaymentProvider.ts` implementando `PaymentProvider`:
   - `criarCobranca`: Pix → QR/copia e cola; boleto → linha digitável/PDF; cartão → link
     do checkout transparente ou token. Devolva `{ ref, status: "PENDENTE", payload }` —
     `payload` é o que a página de confirmação e o e-mail mostram.
   - `processarWebhook(rawBody, headers)`: **valide a assinatura** do gateway antes de ler o corpo
     e devolva `{ ref, status }` (`PAGO`, `CANCELADO`, `EXPIRADO`).
2. Em `index.ts`: `export const paymentProvider = new XPaymentProvider(process.env.X_API_KEY)`.
3. No painel do gateway, cadastre o webhook: `https://API/payments/webhook/<name>`.
4. Variáveis no Render: chave do gateway e segredo do webhook.
5. Cartão: a tela de pagamento (`web/src/components/checkout/CheckoutFlow.tsx`, etapa 3) precisa
   do formulário/SDK do gateway (tokenização no navegador — o número do cartão nunca passa pela API).

O webhook é idempotente: só move de *Aguardando pagamento* para *Pago* uma vez.

### Testar o webhook simulado

Com `MOCK_WEBHOOK_SECRET` definido na API:

```bash
BODY='{"ref":"mock_xxx","status":"PAGO"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$MOCK_WEBHOOK_SECRET" | cut -d' ' -f2)
curl -X POST http://127.0.0.1:4000/payments/webhook/mock -H "Content-Type: application/json" -H "x-mock-signature: $SIG" -d "$BODY"
```

## Frete — `api/src/providers/shipping/`

| Arquivo | Papel |
|---|---|
| `ShippingProvider.ts` | contrato: `cotar`, `rastrear` |
| `ManualShippingProvider.ts` | regras do admin (atual): valor fixo e prazo por região (UF), expressa e retirada |
| `index.ts` | **ponto de troca** |

Regras atuais (editáveis no admin, fase 5): tabela `shipping_regions` e `settings.shipping`
(frete grátis acima de R$ 299 **sobre o valor já com desconto**, só no envio padrão; retirada na loja).

Para uma transportadora/agregador (Melhor Envio, Frenet, Correios): implemente `cotar` com a API
deles (peso/dimensões por variante entram no cadastro do produto) e `rastrear` com o código do pedido.
Mantenha `eligibleForFree: true` no serviço que deve ficar grátis acima do mínimo.

O CEP é consultado no **ViaCEP** pelo servidor (`api/src/lib/viacep.ts`); a UF do frete vem do CEP,
não do formulário.

## E-mail — `api/src/providers/email/`

- Sem `RESEND_API_KEY`: os e-mails são gravados em `api/.data/emails/` (desenvolvimento).
- Com `RESEND_API_KEY` + `EMAIL_FROM`: envio real pelo Resend (domínio precisa estar verificado — SPF/DKIM).
- Modelo: `api/src/emails/orderConfirmation.ts`. Reenvio: `sendConfirmationEmail(orderId, { force: true })` (botão no admin, fase 5).

## Job de expiração

`node dist/jobs/expire-orders.js` — agendar no Render como **Cron Job** a cada 5 minutos
(`*/5 * * * *`). Seguro com execuções simultâneas: cada pedido só é liberado uma vez.
