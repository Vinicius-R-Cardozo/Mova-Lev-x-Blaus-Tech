import { Skeleton, SkeletonCard } from "@/components/motion/Skeleton";

/** Enquanto a coleção carrega: banner, filtros e grade no mesmo desenho da página. */
export default function LoadingCategory() {
  return (
    <div role="status" aria-label="Carregando peças">
      <Skeleton className="h-[230px] md:h-[380px]" />
      <div className="container-site pb-24 pt-5 md:pt-7">
        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-10 lg:grid-cols-[252px_1fr] lg:gap-[42px]">
          <div className="hidden space-y-5 pt-1 md:block">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div>
            <Skeleton className="h-12 md:hidden" />
            <div className="mt-4 flex items-center justify-between border-b border-linha pb-4 md:mt-0">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="hidden h-[46px] w-[180px] md:block" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-3 lg:gap-x-4 lg:gap-y-12">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
