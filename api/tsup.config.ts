import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/jobs/expire-orders.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // O pacote compartilhado é TypeScript puro: entra no bundle.
  noExternal: ["@movalev/shared"],
});
