/** Schemas dos conteúdos editáveis (tabela settings) — validados na leitura e no admin. */
import { z } from "zod";
import { SENSATIONS } from "./catalog";

const cta = z.object({ label: z.string().min(1), href: z.string().min(1) });
const slugRef = z.object({ productSlug: z.string().min(1), colorSlug: z.string().min(1) });

export const homeContentSchema = z.object({
  hero: z.object({
    kicker: z.string(),
    titleLine1: z.string(),
    titleLine2: z.string(),
    videoUrl: z.string().url().nullable(),
    posterUrl: z.string().url().nullable(),
    caption: z.string(),
    primaryCta: cta,
    secondaryCta: cta,
  }),
  campaign: z.object({ title: z.string(), cta: z.string(), items: z.array(slugRef).max(4) }),
  shopTheLook: z.object({
    kicker: z.string(),
    title: z.string(),
    titleEmphasis: z.string(),
    caption: z.string(),
    imageUrl: z.string().url().nullable(),
    note: z.string(),
    cta: z.string(),
    items: z.array(slugRef.extend({ hotspot: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }) })).max(6),
  }),
  sensations: z.array(z.object({ sensation: z.enum(SENSATIONS), title: z.string(), text: z.string(), href: z.string(), imageUrl: z.string().url().nullable().optional() })).max(2),
  studio: z.object({
    kicker: z.string(),
    title: z.string(),
    titleEmphasis: z.string(),
    text: z.string(),
    cta,
    classes: z.array(z.object({ title: z.string(), meta: z.string(), tone: z.string(), videoUrl: z.string().url().nullable(), imageUrl: z.string().url().nullable().optional() })).max(6),
  }),
  instagram: z.object({
    title: z.string(),
    handle: z.string(),
    url: z.string().url(),
    tiles: z.array(z.object({ tone: z.string(), caption: z.string(), imageUrl: z.string().url().nullable().optional() })).max(12),
  }),
});
export type HomeContent = z.infer<typeof homeContentSchema>;

export const shippingSettingsSchema = z.object({
  freeShippingThresholdCents: z.number().int().min(0),
  pickup: z.object({ enabled: z.boolean(), label: z.string(), address: z.string(), days: z.number().int().min(0) }),
});
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
