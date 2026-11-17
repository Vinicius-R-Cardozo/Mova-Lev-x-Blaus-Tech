import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { ArrowLeftIcon, LockIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

/** Layout enxuto do checkout: sem menu, sem rodapé, sem distrações. */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-linha">
        <div className="mx-auto grid h-16 max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center px-4 md:h-[68px] md:px-6">
          <Link href="/" className="inline-flex min-h-touch items-center gap-2 text-[15px] font-normal hover:text-oliva">
            <ArrowLeftIcon /> <span className="hidden sm:inline">Voltar à loja</span>
            <span className="sm:hidden">Loja</span>
          </Link>
          <Link href="/" aria-label="MOVA LEV — página inicial">
            <BrandMark variant="wordmark" decorative className="h-[18px] md:h-[22px]" />
          </Link>
          <p className="flex items-center justify-end gap-2 text-[14px] font-normal md:text-[15px]">
            <LockIcon /> <span className="hidden sm:inline">Compra 100% segura</span>
            <span className="sm:hidden">Segura</span>
          </p>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
    </>
  );
}
