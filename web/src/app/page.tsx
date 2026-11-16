import { LogoCompleta } from "@/components/brand/LogoCompleta";
import { Wordmark } from "@/components/brand/Wordmark";
import { API_URL } from "@/lib/site";
import { formatBRL, installmentLabel } from "@movalev/shared";

/**
 * Fase 1 — página provisória de conferência dos tokens contra o PDF.
 * Será substituída pela Home na fase 2.
 */
export const dynamic = "force-dynamic";

async function apiHealth() {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    return (await res.json()) as { status: string; db: string; latencyMs?: number };
  } catch {
    return { status: "offline", db: "?" };
  }
}

const palette = [
  ["Off-white", "#F5F2EE", "bg-offwhite"],
  ["Areia", "#E6D5C5", "bg-areia"],
  ["Taupe", "#A99A8A", "bg-taupe"],
  ["Verde-oliva", "#4D5A3A", "bg-oliva"],
  ["Preto", "#1A1A1A", "bg-preto"],
  ["Bege-claro", "#ECE6DD", "bg-bege"],
  ["Sálvia", "#DDE0D3", "bg-salvia"],
  ["Taupe-claro", "#CFC4B7", "bg-taupe-claro"],
] as const;

export default async function Page() {
  const health = await apiHealth();
  return (
    <main className="container-site py-16">
      <header className="flex items-center justify-between border-b border-linha pb-6">
        <p className="label text-texto-2">Template da loja · Fase 1 · Tokens</p>
        <p className="label text-texto-2">
          API: <span className={health.status === "ok" ? "text-oliva" : "text-erro"}>{health.status}</span> · banco {health.db}
        </p>
      </header>

      <section className="grid gap-16 py-16 lg:grid-cols-2">
        <div>
          <div className="border border-linha p-6 text-preto">
            <LogoCompleta className="h-auto w-full" />
          </div>
          <h1 className="mt-12 text-h2-sm md:text-h2">
            Template da loja
            <br />
            <em className="text-oliva">Campanha + sacola inteligente</em>
          </h1>
          <ul className="mt-10 flex flex-wrap gap-6">
            {palette.map(([name, hex, cls]) => (
              <li key={hex} className="w-24">
                <span className={`block h-24 w-24 rounded-full border border-linha ${cls}`} aria-hidden />
                <span className="mt-3 block text-body-sm font-normal">{name}</span>
                <span className="block text-[13px] text-texto-2">{hex}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-10">
          <div className="flex min-h-[360px] flex-col overflow-hidden bg-gradient-to-b from-[#B9AA97] via-[#9A8B7A] to-[#4F473F] p-8 text-offwhite">
            <Wordmark className="mx-auto mb-16 h-6 w-auto text-offwhite" />
            <p className="label">Coleção Respiro · Outono</p>
            <p className="mt-4 font-display text-hero-m">
              Movimento <em>é vida.</em>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#" className="btn-light">Comprar a coleção</a>
              <a href="#" className="btn-outline-light">▶ Ver o filme</a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button className="btn-primary">Adicionar à sacola</button>
            <button className="btn-secondary">Carregar mais</button>
            <button className="btn-dark">Assinar</button>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-t border-linha pt-8 text-body-sm">
            <dt className="label text-texto-2">Hero</dt><dd className="font-display text-h3">128px / 60px</dd>
            <dt className="label text-texto-2">H2</dt><dd className="font-display text-h3-sm">52–64px</dd>
            <dt className="label text-texto-2">Corpo</dt><dd>Jost 300 · 15–17px</dd>
            <dt className="label text-texto-2">Preço</dt><dd>{formatBRL(28900, { compact: true })} · {installmentLabel(28900)}</dd>
            <dt className="label text-texto-2">Total</dt><dd>{formatBRL(123456)}</dd>
          </dl>

          <div className="border border-linha p-10 text-areia">
            <LogoCompleta className="h-auto w-full" />
          </div>
        </div>
      </section>
    </main>
  );
}
