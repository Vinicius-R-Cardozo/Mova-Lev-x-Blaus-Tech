import { MockPaymentProvider } from "./MockPaymentProvider";
import type { PaymentProvider } from "./PaymentProvider";

// ⇢ Ponto de troca: substitua por new MercadoPagoPaymentProvider(...) etc.
export const paymentProvider: PaymentProvider = new MockPaymentProvider(process.env.MOCK_WEBHOOK_SECRET || undefined);
export const paymentProviders: Record<string, PaymentProvider> = { [paymentProvider.name]: paymentProvider };
export type { PaymentMethodId } from "./PaymentProvider";
