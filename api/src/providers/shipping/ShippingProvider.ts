/**
 * Contrato de frete. Hoje: ManualShippingProvider (regras do admin).
 * Para ligar uma transportadora (Melhor Envio, Frenet, Correios…): implemente esta
 * interface num novo arquivo e troque a instância em ./index.ts — nada mais muda.
 */
export type ShippingMethodId = "PADRAO" | "EXPRESSA" | "RETIRADA";

export interface ShippingQuoteInput {
  cep: string;
  uf: string;
  /** Peças e valor já com desconto — algumas transportadoras usam no cálculo. */
  pieces: number;
  merchandiseCents: number;
}

export interface ShippingOption {
  id: ShippingMethodId;
  label: string;
  /** Prazo em dias úteis. */
  days: number;
  /** Preço cheio do método (o frete grátis é aplicado depois, pela regra de preço). */
  cents: number;
  /** Participa do "frete grátis acima de R$ 299"? */
  eligibleForFree: boolean;
  description: string;
}

export interface TrackingEvent {
  at: string;
  status: string;
  location?: string;
}

export interface ShippingProvider {
  readonly name: string;
  cotar(input: ShippingQuoteInput): Promise<ShippingOption[]>;
  rastrear(trackingCode: string): Promise<TrackingEvent[]>;
}
