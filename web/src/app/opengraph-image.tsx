import { ImageResponse } from "next/og";
import { LogoCompleta } from "@/components/brand/LogoCompleta";

export const alt = "MOVA LEV — Vista seu movimento. Viva seu leve.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem de compartilhamento padrão (redes sociais, WhatsApp). */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F6F3EC", padding: 72 }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: "#5E564D" }}>MODA FITNESS FEMININA · COLEÇÃO RESPIRO</div>
        <div style={{ display: "flex", color: "#1A1A1A", width: 1056 }}>
          <LogoCompleta width={1056} height={263} />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["#F6F3EC", "#E7D6C6", "#A89B8A", "#4C5A39", "#1A1A1A"].map((c) => (
            <div key={c} style={{ width: 56, height: 56, borderRadius: 28, background: c, border: "1px solid rgba(26,26,26,0.15)" }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
