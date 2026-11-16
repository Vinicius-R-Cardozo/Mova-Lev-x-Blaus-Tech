"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  UFS,
  addressSchema,
  customerSchema,
  formatBRL,
  installmentCents,
  type CheckoutQuoteDTO,
  type OrderCreatedDTO,
  type OrderInput,
} from "@movalev/shared";
import { useCart } from "@/lib/cart";
import { ApiError, post } from "@/lib/api";
import { API_URL } from "@/lib/site";
import { cn } from "@/lib/cn";
import { CheckoutSteps } from "./CheckoutSteps";
import { CheckoutSummary } from "./CheckoutSummary";
import { Field } from "./Field";

type Step = 1 | 2 | 3;
type ShippingId = "PADRAO" | "EXPRESSA" | "RETIRADA";
type PayId = "PIX" | "CARTAO" | "BOLETO";
type Errors = Record<string, string>;

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const maskCep = (v: string) => onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const maskCpf = (v: string) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]): Errors {
  const out: Errors = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "");
    out[k] ??= i.message;
  }
  return out;
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Mesma compra (mesmo corpo) = mesma chave, mesmo após recarregar a página: nunca duplica. */
async function idempotencyKeyFor(body: unknown) {
  const hash = await sha256(JSON.stringify(body));
  const storeKey = `movalev:checkout:${hash.slice(0, 32)}`;
  try {
    const saved = sessionStorage.getItem(storeKey);
    if (saved) return saved;
    const key = crypto.randomUUID();
    sessionStorage.setItem(storeKey, key);
    return key;
  } catch {
    return `${hash.slice(0, 40)}`;
  }
}

export function CheckoutFlow() {
  const cart = useCart();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [customer, setCustomer] = useState({ email: "", name: "", phone: "", cpf: "" });
  const [newsletter, setNewsletter] = useState(false);
  const [address, setAddress] = useState({ cep: "", street: "", number: "", complement: "", district: "", city: "", uf: "" });
  const [shippingMethod, setShippingMethod] = useState<ShippingId | null>(null);
  const [payment, setPayment] = useState<{ method: PayId; installments: number }>({ method: "PIX", installments: 6 });
  const [coupon, setCoupon] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [quote, setQuote] = useState<CheckoutQuoteDTO | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "ok" | "notfound">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const filledCep = useRef<string>("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const cep = onlyDigits(address.cep);
  const emailOk = customerSchema.shape.email.safeParse(customer.email).success;
  const items = useMemo(() => cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), [cart.lines]);
  const itemsSig = items.map((i) => `${i.variantId}:${i.quantity}`).join("|");

  // ── Orçamento no servidor (itens, cupom, CEP, frete) ──
  useEffect(() => {
    if (!cart.ready || items.length === 0) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setQuoting(true);
      try {
        const res = await fetch(`${API_URL}/checkout/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            couponCode: coupon || undefined,
            email: emailOk ? customer.email : undefined,
            cep: cep.length === 8 ? cep : undefined,
            shippingMethod: shippingMethod ?? undefined,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as CheckoutQuoteDTO;
        setQuote(data);
        if (cep.length === 8) {
          setCepStatus(data.address ? "ok" : "notfound");
          // Autopreenche pelo ViaCEP (uma vez por CEP, sem apagar o que a cliente digitou depois).
          if (data.address && filledCep.current !== cep) {
            filledCep.current = cep;
            setAddress((a) => ({ ...a, street: data.address!.street || a.street, district: data.address!.district || a.district, city: data.address!.city, uf: data.address!.uf }));
            setTimeout(() => document.getElementById("f-number")?.focus(), 0);
          }
        }
        if (data.shippingMethod && data.shippingMethod !== shippingMethod) setShippingMethod(data.shippingMethod);
      } catch {
        /* abortado / offline */
      } finally {
        setQuoting(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [cart.ready, itemsSig, coupon, emailOk && customer.email, cep, shippingMethod]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cep.length !== 8) setCepStatus("idle");
  }, [cep]);

  const go = (s: Step) => {
    setStep(s);
    setSubmitError(null);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const parsedCustomer = () => customerSchema.safeParse({ ...customer, cpf: customer.cpf ? customer.cpf : undefined });

  const submitStep1 = (e: FormEvent) => {
    e.preventDefault();
    const r = parsedCustomer();
    if (!r.success) return setErrors(issuesToErrors(r.error.issues));
    setErrors({});
    go(2);
  };

  const submitStep2 = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!shippingMethod) errs.shipping = "Informe o CEP e escolha a forma de envio.";
    if (shippingMethod !== "RETIRADA") {
      const r = addressSchema.safeParse(address);
      if (!r.success) Object.assign(errs, issuesToErrors(r.error.issues));
      if (cepStatus === "notfound") errs.cep = "CEP não encontrado.";
    }
    setErrors(errs);
    if (Object.keys(errs).length === 0) go(3);
    else document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
  };

  async function confirm() {
    const c = parsedCustomer();
    if (!c.success) return go(1);
    const body: OrderInput = {
      customer: c.data,
      items,
      couponCode: quote?.pricing.coupon?.applied ? coupon : undefined,
      shipping: {
        method: shippingMethod!,
        address: shippingMethod === "RETIRADA" ? undefined : addressSchema.parse(address),
      },
      payment: { method: payment.method, installments: payment.method === "CARTAO" ? payment.installments : 1 },
      acceptsNewsletter: newsletter || undefined,
    };
    setSubmitting(true);
    setSubmitError(null);
    const key = await idempotencyKeyFor(body);
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const created = await post<OrderCreatedDTO>("/orders", body, key);
        cart.clear();
        router.replace(`/checkout/confirmacao/${created.id}?t=${created.accessToken}`);
        return;
      } catch (err) {
        // 409 "em andamento": a mesma compra está sendo processada — aguarda e consulta de novo.
        if (err instanceof ApiError && err.code === "em_andamento" && attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        setSubmitError(err instanceof Error ? err.message : "Não foi possível criar o pedido.");
        break;
      }
    }
    setSubmitting(false);
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-24 md:px-6">
        <h1 className="text-h2-sm">Sua sacola está vazia.</h1>
        <Link href="/colecao/novidades" className="btn-primary mt-8">
          Ver novidades
        </Link>
      </div>
    );
  }

  const pricing = quote?.pricing ?? cart.pricing;
  const lines = quote?.lines ?? cart.lines.map((l) => ({ ...l, maxQuantity: l.maxQuantity ?? 10 }));
  const tiers = quote?.tiers ?? cart.tiers;
  const options = quote?.shippingOptions ?? [];
  const hasSoldOut = lines.some((l) => l.maxQuantity === 0);
  const payable = payment.method === "PIX" ? pricing.pixTotalCents : pricing.totalCents;
  const chosen = options.find((o) => o.id === shippingMethod);

  const summary = (idPrefix: string) => (
    <CheckoutSummary
      idPrefix={idPrefix}
      lines={lines}
      pricing={pricing}
      tiers={tiers}
      couponCode={coupon}
      onApplyCoupon={setCoupon}
      shippingKnown={!!chosen}
      loading={quoting}
    />
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 md:px-6 md:pt-[42px]">
      {/* Mobile: resumo recolhível no topo */}
      <details className="mb-6 border border-linha bg-white lg:hidden">
        <summary className="flex min-h-[52px] cursor-pointer items-center justify-between px-4 text-[15px]">
          <span>Ver resumo ({pricing.pieces} {pricing.pieces === 1 ? "peça" : "peças"})</span>
          <span className="font-normal">{formatBRL(pricing.totalCents)}</span>
        </summary>
        <div className="border-t border-linha">{summary("m")}</div>
      </details>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_506px]">
        <div className="min-w-0">
          <CheckoutSteps current={step} onGo={go} />

          {step > 1 && (
            <div className="mt-8 flex items-center justify-between bg-bege px-5 py-4 text-[16px]">
              <span className="truncate">{customer.email}</span>
              <button type="button" onClick={() => go(1)} className="ml-4 min-h-touch shrink-0 text-[15px] font-normal underline decoration-1 underline-offset-4">
                Alterar<span className="sr-only"> identificação</span>
              </button>
            </div>
          )}
          {step > 2 && chosen && (
            <div className="mt-2 flex items-center justify-between bg-bege px-5 py-4 text-[15px]">
              <span className="min-w-0 truncate">
                {chosen.label} ·{" "}
                {shippingMethod === "RETIRADA" ? chosen.description : `${address.street}, ${address.number} — ${address.city}/${address.uf}`}
              </span>
              <button type="button" onClick={() => go(2)} className="ml-4 min-h-touch shrink-0 font-normal underline decoration-1 underline-offset-4">
                Alterar<span className="sr-only"> entrega</span>
              </button>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={submitStep1} noValidate className="mt-10">
              <h1 ref={headingRef} tabIndex={-1} className="text-[40px] leading-tight focus:outline-none md:text-[46px]">
                Identificação
              </h1>
              <p className="mt-2 text-[15px] font-light text-texto-2">
                Usamos seu e-mail para enviar a confirmação e o acompanhamento do pedido.{" "}
                <Link href="/conta" className="font-normal text-texto underline decoration-1 underline-offset-4">
                  Já tem conta? Entrar
                </Link>
              </p>
              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  error={errors.email}
                  className="md:col-span-2"
                  required
                />
                <Field
                  label="Nome completo"
                  name="name"
                  autoComplete="name"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  error={errors.name}
                  className="md:col-span-2"
                  required
                />
                <Field
                  label="Celular com DDD"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(11) 90000-0000"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: maskPhone(e.target.value) })}
                  error={errors.phone}
                  required
                />
                <Field
                  label="CPF (opcional)"
                  name="cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={customer.cpf}
                  onChange={(e) => setCustomer({ ...customer, cpf: maskCpf(e.target.value) })}
                  error={errors.cpf}
                  hint="Para a nota fiscal."
                />
              </div>
              <label className="mt-6 flex min-h-touch cursor-pointer items-center gap-3 text-[15px] font-light">
                <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="h-5 w-5 accent-oliva" />
                Quero receber novidades da MOVA LEV por e-mail
              </label>
              <button type="submit" className="btn-primary mt-8 h-[60px] w-full">
                Continuar para a entrega
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submitStep2} noValidate className="mt-10">
              <h1 ref={headingRef} tabIndex={-1} className="text-[40px] leading-tight focus:outline-none md:text-[46px]">
                Endereço de entrega
              </h1>
              <div className="mt-7 grid grid-cols-[1fr_120px] gap-x-4 gap-y-5 md:grid-cols-[1fr_158px]">
                <div className="col-span-2 flex items-end gap-4">
                  <Field
                    label="CEP"
                    name="cep"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    value={address.cep}
                    onChange={(e) => setAddress({ ...address, cep: maskCep(e.target.value) })}
                    error={errors.cep ?? (cepStatus === "notfound" ? "CEP não encontrado. Confira os números." : undefined)}
                    className="w-[158px]"
                    required
                  />
                  <a
                    href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("mb-4 text-[15px] font-normal underline decoration-1 underline-offset-4", (errors.cep || cepStatus === "notfound") && "mb-10")}
                  >
                    Não sei meu CEP
                  </a>
                </div>
                <Field label="Rua" name="street" autoComplete="address-line1" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} error={errors.street} />
                <Field label="Número" name="number" autoComplete="off" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} error={errors.number} />
                <div className="col-span-2 grid gap-x-4 gap-y-5 md:grid-cols-2">
                  <Field
                    label="Complemento"
                    name="complement"
                    autoComplete="address-line2"
                    placeholder="Apto, bloco (opcional)"
                    value={address.complement}
                    onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                  />
                  <Field label="Bairro" name="district" value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} error={errors.district} />
                </div>
                <Field label="Cidade" name="city" autoComplete="address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} error={errors.city} />
                <div>
                  <label htmlFor="f-uf" className="mb-2 block text-[13px] font-normal text-texto-2">
                    UF
                  </label>
                  <select
                    id="f-uf"
                    value={address.uf}
                    onChange={(e) => setAddress({ ...address, uf: e.target.value })}
                    aria-invalid={!!errors.uf}
                    className={cn("h-[54px] w-full border bg-white px-3 text-[16px] font-light focus:border-preto focus:outline-none", errors.uf ? "border-erro" : "border-linha-forte")}
                  >
                    <option value="" />
                    {UFS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <fieldset className="mt-12">
                <legend className="font-display text-[32px] leading-tight md:text-[36px]">Forma de envio</legend>
                {options.length === 0 ? (
                  <p id="f-shipping" tabIndex={-1} className={cn("mt-4 text-[15px] font-light", errors.shipping ? "text-erro" : "text-texto-2")}>
                    {cep.length === 8 && quoting ? "Calculando o frete…" : errors.shipping ?? "Informe o CEP para ver as opções de envio."}
                  </p>
                ) : (
                  <div className="mt-5 space-y-3" role="radiogroup" aria-label="Forma de envio">
                    {options.map((o) => (
                      <label
                        key={o.id}
                        className={cn(
                          "flex min-h-[86px] cursor-pointer items-center gap-5 border bg-white px-5 py-4 transition-colors md:px-6",
                          shippingMethod === o.id ? "border-preto" : "border-linha-forte hover:border-taupe",
                        )}
                      >
                        <input
                          type="radio"
                          name="envio"
                          value={o.id}
                          checked={shippingMethod === o.id}
                          onChange={() => setShippingMethod(o.id)}
                          className="h-5 w-5 shrink-0 accent-oliva"
                        />
                        <span className="flex-1">
                          <span className="block text-[17px] font-normal">{o.label}</span>
                          <span className="block text-[15px] font-light text-texto-2">{o.id === "RETIRADA" ? o.description : `${o.days} ${o.days === 1 ? "dia útil" : "dias úteis"}`}</span>
                        </span>
                        <span className={cn("text-[17px] font-normal", o.finalCents === 0 && "text-oliva")}>{o.finalCents === 0 ? "Grátis" : formatBRL(o.finalCents)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              <button type="submit" className="btn-primary mt-8 h-[60px] w-full">
                Ir para o pagamento
              </button>
              <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="Formas de pagamento aceitas">
                {["Pix · 5% off", "Cartão em até 6x", "Boleto"].map((c) => (
                  <li key={c} className="border border-linha-forte px-3 py-1.5 text-[13px] font-light">
                    {c}
                  </li>
                ))}
              </ul>
            </form>
          )}

          {step === 3 && (
            <div className="mt-10">
              <h1 ref={headingRef} tabIndex={-1} className="text-[40px] leading-tight focus:outline-none md:text-[46px]">
                Pagamento
              </h1>
              <div className="mt-6 space-y-3" role="radiogroup" aria-label="Forma de pagamento">
                <PayCard id="PIX" selected={payment.method} onSelect={(m) => setPayment({ ...payment, method: m })} title="Pix" note={`5% off · ${formatBRL(pricing.pixTotalCents)}`}>
                  Aprovação na hora. O código vale por 60 minutos.
                </PayCard>
                <PayCard id="CARTAO" selected={payment.method} onSelect={(m) => setPayment({ ...payment, method: m })} title="Cartão de crédito" note="em até 6x sem juros">
                  {payment.method === "CARTAO" ? (
                    <span className="mt-3 block">
                      <select
                        id="parcelas"
                        aria-label="Número de parcelas"
                        value={payment.installments}
                        onChange={(e) => setPayment({ ...payment, installments: Number(e.target.value) })}
                        className="h-12 w-full max-w-xs border border-linha-forte bg-white px-3 text-[15px] focus:border-preto focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n}x de {formatBRL(installmentCents(pricing.totalCents, n))} sem juros
                          </option>
                        ))}
                      </select>
                    </span>
                  ) : (
                    "Visa, Mastercard, Elo e American Express."
                  )}
                </PayCard>
                <PayCard id="BOLETO" selected={payment.method} onSelect={(m) => setPayment({ ...payment, method: m })} title="Boleto" note={formatBRL(pricing.totalCents)}>
                  Vence em 3 dias úteis. As peças ficam reservadas até a compensação.
                </PayCard>
              </div>
              <p className="mt-5 bg-salvia px-4 py-3 text-[14px] font-light text-texto-3">
                Ambiente de demonstração: nenhuma cobrança é feita agora. O pedido é criado como “Aguardando pagamento”.
              </p>

              {hasSoldOut && (
                <p role="alert" className="mt-5 text-[15px] text-erro">
                  Há itens esgotados no resumo. <Link href="/" className="underline">Volte à loja</Link> e remova-os da sacola.
                </p>
              )}
              {submitError && (
                <p role="alert" className="mt-5 border border-erro/40 bg-erro/5 px-4 py-3 text-[15px] text-erro">
                  {submitError}
                </p>
              )}
              <button type="button" onClick={confirm} disabled={submitting || hasSoldOut || !quote} className="btn-primary mt-7 h-[60px] w-full">
                {submitting ? "Criando seu pedido…" : `Confirmar pedido · ${formatBRL(payable)}`}
              </button>
              <p className="mt-3 text-center text-[13px] font-light text-texto-2">
                Ao confirmar, você concorda com os{" "}
                <Link href="/termos-de-uso" className="underline">
                  Termos de uso
                </Link>{" "}
                e a{" "}
                <Link href="/politica-de-privacidade" className="underline">
                  Política de privacidade
                </Link>
                .
              </p>
            </div>
          )}
        </div>

        <aside className="hidden lg:block" aria-label="Resumo do pedido">
          <div className="sticky top-6">{summary("d")}</div>
        </aside>
      </div>
    </div>
  );
}

function PayCard({
  id,
  selected,
  onSelect,
  title,
  note,
  children,
}: {
  id: PayId;
  selected: PayId;
  onSelect: (m: PayId) => void;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  const on = selected === id;
  return (
    <label className={cn("flex cursor-pointer gap-5 border bg-white px-5 py-5 transition-colors md:px-6", on ? "border-preto" : "border-linha-forte hover:border-taupe")}>
      <input type="radio" name="pagamento" value={id} checked={on} onChange={() => onSelect(id)} className="mt-1 h-5 w-5 shrink-0 accent-oliva" />
      <span className="flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4">
          <span className="text-[17px] font-normal">{title}</span>
          <span className="text-[15px] font-normal text-oliva">{note}</span>
        </span>
        <span className="mt-1 block text-[15px] font-light text-texto-2">{children}</span>
      </span>
    </label>
  );
}
