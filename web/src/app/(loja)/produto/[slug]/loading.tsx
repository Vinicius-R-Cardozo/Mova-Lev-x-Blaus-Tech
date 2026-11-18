import { Skeleton } from "@/components/motion/Skeleton";

/** Enquanto a peça carrega: galeria e coluna de compra no mesmo desenho da página. */
export default function LoadingProduct() {
  return (
    <div role="status" aria-label="Carregando peça" className="container-site pb-24 pt-5 md:pt-7">
      <Skeleton className="mb-6 hidden h-3 w-56 md:block" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:gap-14">
        <div>
          <div className="hidden grid-cols-2 gap-2 lg:grid">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[3/4]" />
            ))}
          </div>
          <Skeleton className="-mx-4 aspect-[3/4] lg:hidden" />
        </div>
        <div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-4 h-10 w-4/5 md:h-14" />
          <Skeleton className="mt-5 h-6 w-32" />
          <Skeleton className="mt-9 h-4 w-24" />
          <div className="mt-3 flex gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-[46px] w-[46px] rounded-full" />
            ))}
          </div>
          <Skeleton className="mt-9 h-4 w-24" />
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[54px]" />
            ))}
          </div>
          <Skeleton className="mt-7 h-[60px]" />
        </div>
      </div>
    </div>
  );
}
