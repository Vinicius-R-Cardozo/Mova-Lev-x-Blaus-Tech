import { describe, expect, it } from "vitest";
import { DEFAULT_TIERS, computePricing, progressiveMessage, type PricingItem } from "./pricing";

const legging = { unitPriceCents: 28900, quantity: 1 };
const top = { unitPriceCents: 18900, quantity: 1 };
const casaco = { unitPriceCents: 39900, quantity: 1 };
const short = { unitPriceCents: 16900, quantity: 1 };
const items = (...xs: PricingItem[]) => ({ items: xs });

describe("desconto progressivo — todas as faixas", () => {
  it("0 e 1 peça: sem desconto", () => {
    expect(computePricing(items()).progressive.percent).toBe(0);
    const one = computePricing(items(legging));
    expect(one.progressive.percent).toBe(0);
    expect(one.discountCents).toBe(0);
    expect(one.totalCents).toBe(28900);
  });
  it("2 peças = 10% (exemplo da sacola do template)", () => {
    const r = computePricing(items(legging, top));
    expect(r.subtotalCents).toBe(47800);
    expect(r.progressive.percent).toBe(10);
    expect(r.progressive.discountCents).toBe(4780);
    expect(r.totalCents).toBe(43020);
    expect(r.installments.valueCents).toBe(7170);
  });
  it("3 peças = 15% (exemplo do checkout do template)", () => {
    const r = computePricing(items(top, legging, casaco));
    expect(r.subtotalCents).toBe(87700);
    expect(r.progressive.discountCents).toBe(13155);
    expect(r.totalCents).toBe(74545);
    expect(r.installments.valueCents).toBe(12424);
    expect(r.pixTotalCents).toBe(70818);
  });
  it("4 peças = 20% e 5+ continua em 20%", () => {
    expect(computePricing(items(top, legging, casaco, short)).progressive.percent).toBe(20);
    expect(computePricing(items(top, legging, casaco, short, short)).progressive.percent).toBe(20);
  });
  it("quantidade conta como peças (2 unidades do mesmo item = 10%)", () => {
    const r = computePricing(items({ unitPriceCents: 28900, quantity: 2 }));
    expect(r.pieces).toBe(2);
    expect(r.progressive.percent).toBe(10);
  });
  it("respeita faixas configuradas no admin (fora de ordem)", () => {
    const r = computePricing({ items: [legging, top, casaco], tiers: [{ minItems: 3, percent: 12 }, { minItems: 2, percent: 5 }] });
    expect(r.progressive.percent).toBe(12);
    expect(r.progressive.next).toBeNull();
  });
  it("informa a próxima faixa", () => {
    expect(computePricing(items(legging)).progressive.next).toEqual({ percent: 10, piecesMissing: 1 });
    expect(computePricing(items(legging, top, casaco, short)).progressive.next).toBeNull();
  });
});

describe("mensagens da barra (texto exato)", () => {
  it.each([
    [0, "Leve 2 peças e ganhe 10% off"],
    [1, "Falta 1 peça para 10% off"],
    [2, "Você ganhou 10% · falta 1 peça para 15%"],
    [3, "Você ganhou 15% · falta 1 peça para 20%"],
    [4, "Desconto máximo: 20% off no kit"],
    [7, "Desconto máximo: 20% off no kit"],
  ])("%i peça(s)", (pieces, msg) => {
    expect(progressiveMessage(pieces, DEFAULT_TIERS)).toBe(msg);
  });
  it("plural quando faltam várias peças", () => {
    expect(progressiveMessage(1, [{ minItems: 3, percent: 10 }])).toBe("Faltam 2 peças para 10% off");
  });
});

describe("frete grátis (sobre o valor já com desconto)", () => {
  it("1 peça de R$ 289: faltam R$ 10,00", () => {
    const r = computePricing(items(legging));
    expect(r.freeShipping.reached).toBe(false);
    expect(r.freeShipping.remainingCents).toBe(1000);
    expect(r.freeShipping.message).toBe("Faltam R$ 10,00 para frete grátis");
  });
  it("exatamente R$ 299 libera", () => {
    expect(computePricing(items({ unitPriceCents: 29900, quantity: 1 })).freeShipping.reached).toBe(true);
  });
  it("subtotal acima de 299 mas abaixo com desconto NÃO libera", () => {
    // 2 × R$ 159 = R$ 318 → 10% = R$ 286,20 (< 299)
    const r = computePricing(items({ unitPriceCents: 15900, quantity: 2 }));
    expect(r.subtotalCents).toBe(31800);
    expect(r.merchandiseCents).toBe(28620);
    expect(r.freeShipping.reached).toBe(false);
    expect(r.freeShipping.remainingCents).toBe(1280);
  });
  it("frete padrão vira grátis; expressa continua cobrada; sem CEP fica a calcular", () => {
    const base = { items: [legging, top] };
    expect(computePricing({ ...base, shippingCents: 1990 }).shippingCents).toBe(0);
    const express = computePricing({ ...base, shippingCents: 3490, shippingEligibleForFree: false });
    expect(express.shippingCents).toBe(3490);
    expect(express.totalCents).toBe(43020 + 3490);
    expect(computePricing(base).shippingCents).toBeNull();
  });
  it("abaixo do mínimo cobra o frete no total", () => {
    const r = computePricing({ items: [short], shippingCents: 1990 });
    expect(r.shippingCents).toBe(1990);
    expect(r.totalCents).toBe(16900 + 1990);
  });
  it("sacola vazia não ganha frete grátis", () => {
    expect(computePricing({ items: [], freeShippingThresholdCents: 0 }).freeShipping.reached).toBe(false);
  });
});

describe("cupom combinado com desconto progressivo", () => {
  it("cupom de 10% acumula sobre o valor já com progressivo", () => {
    const r = computePricing({ items: [legging, top], coupon: { code: "BEMVINDA10", type: "PERCENT", value: 10, stacksWithProgressive: true } });
    // 478,00 − 47,80 = 430,20 → 10% = 43,02
    expect(r.progressive.discountCents).toBe(4780);
    expect(r.coupon).toMatchObject({ applied: true, discountCents: 4302 });
    expect(r.merchandiseCents).toBe(38718);
    expect(r.discountCents).toBe(9082);
  });
  it("cupom fixo nunca deixa o valor negativo", () => {
    const r = computePricing({ items: [short], coupon: { code: "X", type: "FIXED", value: 50000 } });
    expect(r.coupon?.discountCents).toBe(16900);
    expect(r.merchandiseCents).toBe(0);
  });
  it("não cumulativo: vale o maior (progressivo maior → cupom não aplica)", () => {
    const r = computePricing({ items: [legging, top, casaco], coupon: { code: "DEZ", type: "PERCENT", value: 10, stacksWithProgressive: false } });
    expect(r.progressive.percent).toBe(15);
    expect(r.coupon?.applied).toBe(false);
    expect(r.coupon?.reason).toMatch(/não acumula/);
  });
  it("não cumulativo: cupom maior substitui o progressivo", () => {
    const r = computePricing({ items: [legging, top], coupon: { code: "VINTE", type: "PERCENT", value: 20, stacksWithProgressive: false } });
    expect(r.progressive.percent).toBe(0);
    expect(r.progressive.discountCents).toBe(0);
    expect(r.coupon?.discountCents).toBe(9560);
    expect(r.merchandiseCents).toBe(38240);
  });
  it("valor mínimo do cupom", () => {
    const r = computePricing({ items: [short], coupon: { code: "MIN", type: "PERCENT", value: 10, minSubtotalCents: 20000 } });
    expect(r.coupon?.applied).toBe(false);
    expect(r.coupon?.reason).toBe("Válido para compras a partir de R$ 200.");
    expect(r.totalCents).toBe(16900);
  });
  it("cupom pode fazer perder o frete grátis (frete sobre o valor com desconto)", () => {
    // 300,00 sem progressivo; com cupom 5% → 285,00
    const r = computePricing({ items: [{ unitPriceCents: 30000, quantity: 1 }], coupon: { code: "C5", type: "PERCENT", value: 5 }, shippingCents: 1990 });
    expect(r.merchandiseCents).toBe(28500);
    expect(r.freeShipping.reached).toBe(false);
    expect(r.totalCents).toBe(28500 + 1990);
  });
});

describe("arredondamento em centavos", () => {
  it("cada desconto é arredondado (meio para cima)", () => {
    // 3 × R$ 33,33 = 99,99 → 15% = 14,9985 → 15,00
    const r = computePricing({ items: [{ unitPriceCents: 3333, quantity: 3 }] });
    expect(r.progressive.discountCents).toBe(1500);
    expect(r.merchandiseCents).toBe(8499);
  });
  it("cupom sobre base já arredondada", () => {
    // 2 × 10,01 = 20,02 → 10% = 2,002 → 2,00 ; base 18,02 → 10% = 1,802 → 1,80
    const r = computePricing({ items: [{ unitPriceCents: 1001, quantity: 2 }], coupon: { code: "C", type: "PERCENT", value: 10 } });
    expect(r.progressive.discountCents).toBe(200);
    expect(r.coupon?.discountCents).toBe(180);
    expect(r.merchandiseCents).toBe(1622);
  });
  it("parcelas e Pix sempre inteiros em centavos", () => {
    const r = computePricing({ items: [{ unitPriceCents: 9999, quantity: 1 }] });
    expect(Number.isInteger(r.installments.valueCents)).toBe(true);
    expect(r.installments.valueCents).toBe(1667);
    expect(r.pixTotalCents).toBe(9499);
  });
  it("ignora linhas inválidas (quantidade zero ou negativa)", () => {
    const r = computePricing({ items: [legging, { unitPriceCents: 18900, quantity: 0 }, { unitPriceCents: 18900, quantity: -1 }] });
    expect(r.pieces).toBe(1);
    expect(r.subtotalCents).toBe(28900);
  });
});
