import { CardIcon, ExchangeIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";

const items = [
  { Icon: TruckIcon, title: "Frete grátis", text: "acima de R$ 299" },
  { Icon: ExchangeIcon, title: "Troca grátis", text: "em até 30 dias" },
  { Icon: CardIcon, title: "6x sem juros", text: "ou 5% off no Pix" },
  { Icon: ShieldIcon, title: "Compra segura", text: "dados protegidos" },
];

export function Benefits() {
  return (
    <section aria-label="Vantagens" className="mt-20 border-y border-linha md:mt-[100px]">
      <ul data-reveal className="container-site grid grid-cols-2 gap-y-6 py-7 md:grid-cols-4">
        {items.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-center gap-4">
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
