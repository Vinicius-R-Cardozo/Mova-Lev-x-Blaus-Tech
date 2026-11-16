import { prisma } from "../../lib/prisma";
import { loadShippingSettings } from "../../lib/cart";
import type { ShippingOption, ShippingProvider, ShippingQuoteInput, TrackingEvent } from "./ShippingProvider";

const plural = (n: number) => (n === 1 ? "dia útil" : "dias úteis");

/** Frete pelas regras do admin: valor fixo e prazo por região (UF), expressa opcional e retirada. */
export class ManualShippingProvider implements ShippingProvider {
  readonly name = "manual";

  async cotar(input: ShippingQuoteInput): Promise<ShippingOption[]> {
    const [regions, settings] = await Promise.all([
      prisma.shippingRegion.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      loadShippingSettings(),
    ]);
    const region = regions.find((r) => r.ufs.includes(input.uf.toUpperCase()));
    const options: ShippingOption[] = [];
    if (region) {
      options.push({
        id: "PADRAO",
        label: "Padrão",
        days: region.standardDays,
        cents: region.standardCents,
        eligibleForFree: true,
        description: `${region.standardDays} ${plural(region.standardDays)}`,
      });
      if (region.expressCents != null && region.expressDays != null) {
        options.push({
          id: "EXPRESSA",
          label: "Expressa",
          days: region.expressDays,
          cents: region.expressCents,
          eligibleForFree: false,
          description: `${region.expressDays} ${plural(region.expressDays)}`,
        });
      }
    }
    if (settings.pickup.enabled) {
      options.push({
        id: "RETIRADA",
        label: settings.pickup.label,
        days: settings.pickup.days,
        cents: 0,
        eligibleForFree: true,
        description: settings.pickup.address,
      });
    }
    return options;
  }

  async rastrear(trackingCode: string): Promise<TrackingEvent[]> {
    // Sem integração: o código é exibido e a cliente acompanha no site da transportadora.
    return trackingCode ? [{ at: new Date().toISOString(), status: "Código de rastreio informado" }] : [];
  }
}
