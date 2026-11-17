/**
 * Dados da empresa exibidos nas páginas legais. Preencha via variáveis de ambiente
 * (NEXT_PUBLIC_*) antes de publicar — os colchetes aparecem enquanto não houver valor.
 */
export const COMPANY = {
  legalName: process.env.NEXT_PUBLIC_RAZAO_SOCIAL || "[razão social]",
  cnpj: process.env.NEXT_PUBLIC_CNPJ || "[CNPJ]",
  address: process.env.NEXT_PUBLIC_ENDERECO || "[endereço completo]",
  email: process.env.NEXT_PUBLIC_EMAIL_CONTATO || "[e-mail de atendimento]",
  dpoEmail: process.env.NEXT_PUBLIC_EMAIL_DPO || "[e-mail do encarregado de dados]",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "",
  hours: process.env.NEXT_PUBLIC_HORARIO || "segunda a sexta, das 9h às 18h",
  instagram: "https://instagram.com/movalev",
};
