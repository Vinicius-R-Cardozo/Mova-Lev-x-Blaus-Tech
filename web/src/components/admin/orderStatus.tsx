import { ORDER_STATUS_LABEL, type OrderStatus } from "@movalev/shared";
import { cn } from "@/lib/cn";

export const ORDER_TONE: Record<OrderStatus, string> = {
  AGUARDANDO_PAGAMENTO: "bg-areia/70 text-texto-3",
  PAGO: "bg-oliva/15 text-oliva-escuro",
  EM_SEPARACAO: "bg-salvia text-oliva-escuro",
  ENVIADO: "bg-taupe-claro/50 text-texto-3",
  ENTREGUE: "bg-oliva text-offwhite",
  CANCELADO: "bg-linha text-texto-2",
};

export const PAYMENT_LABEL: Record<string, string> = { PIX: "Pix", CARTAO: "Cartão", BOLETO: "Boleto" };

export function OrderBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <span className={cn("label-sm inline-block whitespace-nowrap px-2 py-1 text-[10px]", ORDER_TONE[status], className)}>{ORDER_STATUS_LABEL[status]}</span>;
}
