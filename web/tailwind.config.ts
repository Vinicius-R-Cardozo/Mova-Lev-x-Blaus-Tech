import type { Config } from "tailwindcss";

/**
 * Tokens da identidade MOVA LEV (template "Campanha + sacola inteligente").
 * Cantos retos por padrão: só `rounded-full` (swatches, botões de ícone) e
 * `rounded-sheet` (bottom sheet no mobile) existem.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
    },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#FFFFFF",
      offwhite: "#F6F3EC",
      areia: "#E7D6C6",
      taupe: { DEFAULT: "#A89B8A", claro: "#CFC4B7" },
      oliva: { DEFAULT: "#4C5A39", escuro: "#3F4A2F" },
      preto: "#1A1A1A",
      bege: "#ECE6DD",
      salvia: "#DDE0D3",
      texto: { DEFAULT: "#1A1A1A", 2: "#5E564D", 3: "#3D3832" },
      linha: "rgba(26,26,26,0.1)",
      "linha-forte": "rgba(26,26,26,0.2)",
      erro: "#9A2E1F",
    },
    borderRadius: {
      none: "0",
      DEFAULT: "0",
      full: "9999px",
      sheet: "24px",
    },
    fontFamily: {
      display: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
      sans: ["var(--font-montserrat)", "Montserrat", "system-ui", "sans-serif"],
    },
    extend: {
      fontSize: {
        // Escala do template (desktop / mobile).
        hero: ["128px", { lineHeight: "0.92", letterSpacing: "-0.01em" }],
        "hero-m": ["60px", { lineHeight: "0.95" }],
        h2: ["64px", { lineHeight: "1.02" }],
        "h2-sm": ["52px", { lineHeight: "1.04" }],
        h3: ["40px", { lineHeight: "1.08" }],
        "h3-sm": ["28px", { lineHeight: "1.15" }],
        body: ["16px", { lineHeight: "1.6" }],
        "body-lg": ["17px", { lineHeight: "1.6" }],
        "body-sm": ["15px", { lineHeight: "1.55" }],
        label: ["12px", { lineHeight: "1.2", letterSpacing: "0.2em" }],
        "label-sm": ["11px", { lineHeight: "1.2", letterSpacing: "0.2em" }],
      },
      letterSpacing: { label: "0.2em" },
      spacing: {
        gutter: "40px",
        header: "84px",
      },
      maxWidth: { site: "1440px" },
      height: { hero: "920px", "hero-m": "700px", btn: "56px" },
      minHeight: { touch: "44px" },
      minWidth: { touch: "44px" },
      // Durações e curvas vêm dos tokens de movimento (globals.css).
      transitionDuration: { DEFAULT: "var(--motion-base)", fast: "var(--motion-fast)", base: "var(--motion-base)", slow: "var(--motion-slow)" },
      transitionTimingFunction: { DEFAULT: "var(--ease-standard)", standard: "var(--ease-standard)", out: "var(--ease-out)" },
      scale: { 102: "1.02", 103: "1.03", 98: "0.98" },
      boxShadow: { resumo: "0 12px 40px -12px rgba(26,26,26,0.12)" },
      zIndex: { header: "40", drawer: "60", toast: "70" },
    },
  },
  plugins: [],
};

export default config;
