import type { ColorDTO } from "@movalev/shared";
import { cn } from "@/lib/cn";

/** Bolinha de cor (exceção aos cantos retos). Cores claras ganham contorno. */
const LIGHT = new Set(["#E6D5C5", "#F5F2EE", "#ECE6DD"]);

export function SwatchDot({ color, size = 16, className }: { color: ColorDTO; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full", LIGHT.has(color.hex.toUpperCase()) && "ring-1 ring-inset ring-linha-forte", className)}
      style={{ backgroundColor: color.hex, width: size, height: size }}
      aria-hidden
    />
  );
}
