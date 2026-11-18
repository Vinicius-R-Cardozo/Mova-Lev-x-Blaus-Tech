import { api } from "./api";

const fill = (v: string, placeholder: string) => (v && v.trim() ? v.trim() : placeholder);

/**
 * Dados da empresa para páginas legais, contato e rodapé. Vêm do painel
 * (Configurações › Dados da loja); as variáveis NEXT_PUBLIC_* ficam como reserva.
 * Campos vazios aparecem entre colchetes para ninguém publicar sem preencher.
 */
export async function getCompany() {
  const s = await api
    .store()
    .then((c) => c.store)
    .catch(() => null);
  return {
    name: s?.storeName || "MOVA LEV",
    legalName: fill(s?.legalName || process.env.NEXT_PUBLIC_RAZAO_SOCIAL || "", "[razão social]"),
    cnpj: fill(s?.cnpj || process.env.NEXT_PUBLIC_CNPJ || "", "[CNPJ]"),
    address: fill(s?.address || process.env.NEXT_PUBLIC_ENDERECO || "", "[endereço completo]"),
    email: fill(s?.contactEmail || process.env.NEXT_PUBLIC_EMAIL_CONTATO || "", "[e-mail de atendimento]"),
    dpoEmail: fill(s?.dpoEmail || process.env.NEXT_PUBLIC_EMAIL_DPO || "", "[e-mail do encarregado de dados]"),
    whatsapp: s?.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP || "",
    hours: s?.hours || process.env.NEXT_PUBLIC_HORARIO || "segunda a sexta, das 9h às 18h",
    instagram: s?.instagram || "https://instagram.com/movalev",
  };
}
