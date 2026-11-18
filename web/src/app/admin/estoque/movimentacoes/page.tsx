"use client";
import { useState } from "react";
import { STOCK_MOVEMENT_LABEL, STOCK_MOVEMENT_TYPES } from "@movalev/shared";
import { PageTitle } from "@/components/admin/ui";
import { MovementList, StockTabs } from "../shared";

/** Histórico geral: toda entrada e saída de estoque, com filtros por tipo e período. */
export default function MovimentacoesPage() {
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <>
      <PageTitle>Estoque</PageTitle>
      <StockTabs active="movimentacoes" />
      <div className="mb-5 grid gap-3 sm:grid-cols-3 md:max-w-3xl">
        <select aria-label="Tipo" className="input h-11 bg-white" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {STOCK_MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {STOCK_MOVEMENT_LABEL[t]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[14px] text-texto-2">
          De
          <input type="date" className="input h-11 bg-white" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-[14px] text-texto-2">
          Até
          <input type="date" className="input h-11 bg-white" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <MovementList type={type || undefined} from={from || undefined} to={to || undefined} />
    </>
  );
}
