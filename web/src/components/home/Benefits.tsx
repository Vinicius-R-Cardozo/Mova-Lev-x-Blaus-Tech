import { api } from "@/lib/api";
import { CardIcon, ExchangeIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";

export async function Benefits() {
  const pay = (await api.store().catch(() => null))?.payments;
  const card = pay?.cardEnabled === false ? null : `${pay?.maxInstallments ?? 6}x sem juros`;
  const pix = pay?.pixEnabled === false || pay?.pixDiscountPercent === 0 ? null : `${pay?.pixDiscountPercent ?? 5}% off no Pix`;
  const items = [
    { Icon: TruckIcon, title: "Frete grátis", text: "acima de R$ 299" },
    { Icon: ExchangeIcon, title: "Troca grátis", text: "em até 30 dias" },
    { Icon: CardIcon, title: card ?? pix ?? "Pix, cartão e boleto", text: card && pix ? `ou ${pix}` : "formas de pagamento" },
    { Icon: ShieldIcon, title: "Compra segura", text: "dados protegidos" },
  ];
  return (
    <section aria-label="Vantagens" className="mt-20 border-y border-linha md:mt-[100px]">
      <ul className="container-site grid grid-cols-2 gap-y-6 py-7 md:grid-cols-4">
        {items.map(({ Icon, title, text }) => (
          <li key={title} data-reveal className="flex items-center gap-4">
            <Icon className="shrink-0 text-oliva" />
            <p className="text-[15px] leading-snug">
              <span className="block font-normal">{title}</span>
              <span className="block font-light text-texto-2">{text}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
