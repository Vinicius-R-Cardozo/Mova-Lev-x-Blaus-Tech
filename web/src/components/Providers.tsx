"use client";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { ConsentProvider } from "@/lib/consent";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { Analytics } from "@/components/consent/Analytics";
import { CartProvider } from "@/lib/cart";
import { FavoritesProvider } from "@/lib/favorites";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </CartProvider>
      </AuthProvider>
      <CookieBanner />
      <Analytics />
    </ConsentProvider>
  );
}
