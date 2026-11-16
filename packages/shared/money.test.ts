import { describe, expect, it } from "vitest";
import { formatBRL, installmentCents, installmentLabel, percentOf, pixTotalCents, roundCents } from "./money";

describe("formatBRL", () => {
  it("formata no padrão R$ 1.234,56", () => {
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
    expect(formatBRL(47800)).toBe("R$ 478,00");
    expect(formatBRL(5)).toBe("R$ 0,05");
    expect(formatBRL(123456789)).toBe("R$ 1.234.567,89");
  });
  it("modo compacto omite ,00 só em valor inteiro (vitrine)", () => {
    expect(formatBRL(28900, { compact: true })).toBe("R$ 289");
    expect(formatBRL(4817, { compact: true })).toBe("R$ 48,17");
  });
  it("negativo para linhas de desconto", () => {
    expect(formatBRL(-4780)).toBe("- R$ 47,80");
  });
});

describe("parcelas e Pix (valores do template)", () => {
  it("6x sem juros", () => {
    expect(installmentLabel(28900)).toBe("6x de R$ 48,17 sem juros");
    expect(installmentLabel(18900)).toBe("6x de R$ 31,50 sem juros");
    expect(installmentLabel(34900)).toBe("6x de R$ 58,17 sem juros");
    expect(installmentLabel(39900)).toBe("6x de R$ 66,50 sem juros");
    expect(installmentCents(43020)).toBe(7170);
    expect(installmentCents(74545)).toBe(12424);
  });
  it("Pix 5% off arredondado em centavos", () => {
    expect(pixTotalCents(74545)).toBe(70818);
  });
  it("arredondamento meio-para-cima", () => {
    expect(roundCents(70817.5)).toBe(70818);
    expect(percentOf(87700, 15)).toBe(13155);
    expect(percentOf(47800, 10)).toBe(4780);
  });
});
