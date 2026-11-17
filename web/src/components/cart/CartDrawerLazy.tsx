"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

const CartDrawer = dynamic(() => import("./CartDrawer").then((m) => m.CartDrawer), { ssr: false });

/** A gaveta só é baixada e montada na primeira vez que a sacola abre (menos JS no carregamento). */
export function CartDrawerLazy() {
  const { isOpen } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);
  return mounted ? <CartDrawer /> : null;
}
