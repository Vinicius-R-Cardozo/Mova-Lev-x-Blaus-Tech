import { ManualShippingProvider } from "./ManualShippingProvider";
import type { ShippingProvider } from "./ShippingProvider";

// ⇢ Ponto de troca: substitua por new MelhorEnvioShippingProvider(...) etc.
export const shippingProvider: ShippingProvider = new ManualShippingProvider();
export type { ShippingMethodId, ShippingOption } from "./ShippingProvider";
