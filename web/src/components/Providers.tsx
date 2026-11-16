"use client";
import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart";
import { FavoritesProvider } from "@/lib/favorites";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </CartProvider>
  );
}
