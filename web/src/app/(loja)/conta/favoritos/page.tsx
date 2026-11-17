"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductCardDTO } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { ProductCard } from "@/components/product/ProductCard";

export default function FavoritosPage() {
  const { apiFetch } = useAuth();
  const fav = useFavorites();
  const [items, setItems] = useState<ProductCardDTO[] | null>(null);
  useEffect(() => {
    apiFetch<ProductCardDTO[]>("/me/favorites").then(setItems).catch(() => setItems([]));
  }, [apiFetch, fav.ids.length]);
  const visible = items?.filter((p) => fav.has(p.id));

  return (
    <section aria-labelledby="fav-titulo">
      <h1 id="fav-titulo" className="text-h2-sm md:text-[56px]">Favoritos</h1>
      {!items && <p className="mt-6" role="status">Carregando…</p>}
      {visible?.length === 0 && (
        <div className="mt-6">
          <p className="text-body font-light">Toque no coração das peças para guardar aqui.</p>
          <Link href="/colecao/novidades" className="btn-primary mt-6">Ver novidades</Link>
        </div>
      )}
      {visible && visible.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-3 lg:gap-x-4">
          {visible.map((p) => (
            <li key={p.id}><ProductCard product={p} /></li>
          ))}
        </ul>
      )}
    </section>
  );
}
