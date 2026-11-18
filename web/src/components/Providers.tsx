"use client";
import type { ReactNode } from "react";
import type { StoreConfigDTO } from "@movalev/shared";
import { StoreConfigProvider } from "@/lib/storeConfig";
import { AuthProvider } from "@/lib/auth";
import { ConsentProvider } from "@/lib/consent";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { Analytics } from "@/components/consent/Analytics";
import { CartProvider } from "@/lib/cart";
import { FavoritesProvider } from "@/lib/favorites";

export function Providers({ children, storeConfig }: { children: ReactNode; storeConfig: StoreConfigDTO }) {
  return (
    <StoreConfigProvider value={storeConfig}>
    <ConsentProvider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </CartProvider>
      </AuthProvider>
      <CookieBanner />
      <Analytics />
    </ConsentProvider>
    </StoreConfigProvider>
  );
}
