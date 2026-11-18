import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { slugify } from "@movalev/shared";
import { ContactForm } from "@/components/institutional/ContactForm";
import { CookiePreferencesLink } from "@/components/consent/CookiePreferencesLink";

/**
 * Markdown simples e seguro para as páginas do painel. Monta elementos React (o
 * texto é sempre escapado; nada de HTML cru). Suporta:
 *   ## Título · ### Subtítulo · parágrafos · - listas · 1. listas numeradas
 *   **negrito** · *itálico* · [texto](/link) · tabelas com | · --- (linha)
 *   [[formulario-contato]] · [[preferencias-cookies]] (componentes, numa linha sozinha)
 * Links aceitos: /caminho, #âncora, https://, mailto:, tel: — o resto vira texto.
 */

type Block =
  | { t: "h2" | "h3"; text: string; id: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "hr" }
  | { t: "widget"; name: string };

const WIDGETS: Record<string, () => ReactNode> = {
  "formulario-contato": () => <ContactForm />,
  "preferencias-cookies": () => <CookiePreferencesLink />,
};

const SAFE_HREF = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i;
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const used = new Map<string, number>();
  const anchor = (text: string) => {
    const base = slugify(text.replace(/[*_[\]()]/g, "")) || "secao";
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n ? `${base}-${n + 1}` : base;
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = trimmed.match(/^(#{1,3})\s+(.+)$/))) {
      const level = m[1]!.length === 3 ? "h3" : "h2";
      blocks.push({ t: level, text: m[2]!, id: anchor(m[2]!) });
      i++;
    } else if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push({ t: "hr" });
      i++;
    } else if ((m = trimmed.match(/^\[\[([a-z-]+)\]\]$/))) {
      blocks.push({ t: "widget", name: m[1]! });
      i++;
    } else if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) items.push(lines[i++]!.trim().replace(/^[-*]\s+/, ""));
      blocks.push({ t: "ul", items });
    } else if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i]!)) items.push(lines[i++]!.trim().replace(/^\d+[.)]\s+/, ""));
      blocks.push({ t: "ol", items });
    } else if (trimmed.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) rows.push(cells(lines[i++]!));
      const sepIdx = rows.findIndex((r) => r.every((c) => /^:?-{2,}:?$/.test(c)));
      const head = sepIdx === 1 ? rows[0]! : [];
      blocks.push({ t: "table", head, rows: rows.filter((_, k) => k !== sepIdx && !(sepIdx === 1 && k === 0)) });
    } else {
      // A 1ª linha entra sempre (evita laço infinito com linhas como "[[a preencher…").
      const para: string[] = [lines[i++]!.trim()];
      while (i < lines.length && lines[i]!.trim() && !/^(#{1,3}\s|[-*]\s|\d+[.)]\s|\||\[\[)/.test(lines[i]!.trim())) para.push(lines[i++]!.trim());
      blocks.push({ t: "p", text: para.join(" ") });
    }
  }
  return blocks;
}

/** Negrito, itálico e links dentro de uma linha. */
function inline(text: string, keyBase = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  // O texto do link aceita um nível de colchetes ("[a preencher: …]" de um marcador vazio).
  const re = /\*\*(.+?)\*\*|\[((?:[^[\]]|\[[^\]]*\])+)\]\(([^)]+)\)|\*([^*\s][^*]*?)\*|_([^_\s][^_]*?)_/g;
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${k++}`;
    if (m[1] !== undefined) out.push(<strong key={key}>{inline(m[1], key)}</strong>);
    else if (m[2] !== undefined) {
      const href = m[3]!.trim();
      // Link inseguro, ou com marcador ainda não preenchido: fica só o texto.
      if (!SAFE_HREF.test(href) || /\s|\[a preencher/.test(href)) out.push(<Fragment key={key}>{inline(m[2], key)}</Fragment>);
      else if (href.startsWith("/") || href.startsWith("#")) out.push(<Link key={key} href={href}>{inline(m[2], key)}</Link>);
      else
        out.push(
          <a key={key} href={href} {...(/^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {inline(m[2], key)}
          </a>,
        );
    } else out.push(<em key={key}>{inline(m[4] ?? m[5]!, key)}</em>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** `preview`: no painel, os componentes aparecem só como um quadro indicando o lugar. */
export function Markdown({ source, preview = false }: { source: string; preview?: boolean }) {
  return (
    <>
      {parseMarkdown(source).map((b, n) => {
        switch (b.t) {
          case "h2":
            return <h2 key={n} id={b.id}>{inline(b.text, `h${n}`)}</h2>;
          case "h3":
            return <h3 key={n} id={b.id}>{inline(b.text, `h${n}`)}</h3>;
          case "p":
            return <p key={n}>{inline(b.text, `p${n}`)}</p>;
          case "ul":
            return <ul key={n}>{b.items.map((it, j) => <li key={j}>{inline(it, `u${n}-${j}`)}</li>)}</ul>;
          case "ol":
            return <ol key={n}>{b.items.map((it, j) => <li key={j}>{inline(it, `o${n}-${j}`)}</li>)}</ol>;
          case "hr":
            return <hr key={n} className="my-10 border-linha" />;
          case "widget": {
            const W = WIDGETS[b.name];
            if (preview)
              return (
                <p key={n} className="my-6 border border-dashed border-linha-forte px-4 py-6 text-center text-[13px] text-texto-2">
                  {W ? `[${b.name}] aparece aqui` : `Componente desconhecido: [[${b.name}]]`}
                </p>
              );
            return W ? <div key={n} className="not-prose my-6">{W()}</div> : null;
          }
          case "table":
            return (
              <div key={n} className="overflow-x-auto">
                <table>
                  {b.head.length > 0 && (
                    <thead>
                      <tr>{b.head.map((c, j) => <th key={j} scope="col">{inline(c, `th${n}-${j}`)}</th>)}</tr>
                    </thead>
                  )}
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, x) => (x === 0 && b.head.length ? <th key={x} scope="row" className="!bg-transparent !font-sans !text-[15px] !tracking-normal">{inline(c, `r${n}-${j}-${x}`)}</th> : <td key={x}>{inline(c, `r${n}-${j}-${x}`)}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}

/** Índice "Nesta página" a partir dos títulos ## do texto. */
export const tocFrom = (source: string) => parseMarkdown(source).flatMap((b) => (b.t === "h2" ? [{ id: b.id, label: b.text.replace(/\*\*|\*|_/g, "").replace(/\(.*?\)$/, "").trim() }] : []));
