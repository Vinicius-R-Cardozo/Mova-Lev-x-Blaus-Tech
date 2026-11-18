"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ADMIN_ROLES, ROLE_LABEL, adminUserInviteSchema, type AdminRole } from "@movalev/shared";
import { Card, PageTitle } from "@/components/admin/ui";
import { TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";
import { useAdminMe } from "../../AdminShell";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

type User = { id: string; email: string; name: string | null; role: AdminRole; mustChangePassword: boolean; lastAdminLoginAt: string | null; createdAt: string; mfa: boolean };
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Equipe do painel: convidar, mudar papel, tirar acesso, senha provisória e 2º fator. */
export default function UsuariosPage() {
  const { apiFetch } = useAuth();
  const { toast, confirm } = useFeedback();
  const me = useAdminMe();
  const [users, setUsers] = useState<User[] | null>(null);
  const [invite, setInvite] = useState({ email: "", name: "", role: "EDITOR" as AdminRole });
  const [inviteErr, setInviteErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await apiFetch<User[]>("/admin/users"));
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }, [apiFetch, toast]);
  useEffect(() => void load(), [load]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    const parsed = adminUserInviteSchema.safeParse({ ...invite, name: invite.name || undefined });
    if (!parsed.success) return setInviteErr(parsed.error.issues[0]?.message ?? "Confira os dados.");
    setInviteErr("");
    setBusy(true);
    try {
      const r = await apiFetch<{ email: string; tempPassword: string }>("/admin/users", { method: "POST", body: JSON.stringify(parsed.data) });
      setSecret({ email: r.email, password: r.tempPassword });
      setInvite({ email: "", name: "", role: "EDITOR" });
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setBusy(false);
    }
  }

  async function act(u: User, action: "role" | "remove" | "reset-password" | "reset-mfa", role?: AdminRole) {
    const who = u.name ?? u.email;
    const texts = {
      role: { title: `Mudar ${who} para ${ROLE_LABEL[role!]}?`, text: role === "ADMIN" ? "Terá acesso total: vendas, clientes, configurações e usuários." : "Ficará só com produtos, coleções, estoque e conteúdo.", confirm: "Mudar papel" },
      remove: { title: `Tirar o acesso de ${who}?`, text: "A pessoa deixa de entrar no painel na hora. A conta continua como cliente da loja.", confirm: "Tirar acesso", danger: true },
      "reset-password": { title: `Gerar senha provisória para ${who}?`, text: "A senha atual deixa de valer. Repasse a nova por um canal seguro; ela terá de trocar no próximo acesso.", confirm: "Gerar senha" },
      "reset-mfa": { title: `Redefinir o 2º fator de ${who}?`, text: "Use quando a pessoa perdeu o celular. No próximo login ela lê um QR code novo.", confirm: "Redefinir" },
    }[action];
    if (!(await confirm(texts))) return;
    try {
      if (action === "role") await apiFetch(`/admin/users/${u.id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
      else {
        const r = await apiFetch<{ tempPassword?: string }>(`/admin/users/${u.id}/${action}`, { method: "POST" });
        if (r?.tempPassword) setSecret({ email: u.email, password: r.tempPassword });
      }
      if (action !== "reset-password") toast(action === "remove" ? "Acesso removido." : action === "reset-mfa" ? "2º fator redefinido." : "Papel alterado.");
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  return (
    <>
      <PageTitle>Usuários do painel</PageTitle>
      <Card title="Convidar pessoa">
        <form onSubmit={sendInvite} noValidate className="grid items-end gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
          <div>
            <label htmlFor="conv-email" className="mb-1.5 block text-[13px] text-texto-2">
              E-mail
            </label>
            <input id="conv-email" type="email" className="input h-11 bg-white" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          </div>
          <div>
            <label htmlFor="conv-nome" className="mb-1.5 block text-[13px] text-texto-2">
              Nome
            </label>
            <input id="conv-nome" className="input h-11 bg-white" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="conv-papel" className="mb-1.5 block text-[13px] text-texto-2">
              Papel
            </label>
            <select id="conv-papel" className="input h-11 bg-white" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as AdminRole })}>
              {ADMIN_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy} className="btn-primary h-11 px-6">
            {busy ? "Criando…" : "Convidar"}
          </button>
        </form>
        {inviteErr && <p className="mt-2 text-[13px] text-erro">{inviteErr}</p>}
        <p className="mt-3 text-[13px] text-texto-2">
          <strong className="font-normal">Administrador:</strong> tudo. <strong className="font-normal">Editor:</strong> produtos, estoque, categorias, coleções e conteúdo (sem vendas, clientes e configurações). A pessoa recebe uma senha provisória e cadastra o app autenticador no 1º acesso.
        </p>
      </Card>

      <div className="mt-4">
        {!users ? (
          <TableSkeleton rows={3} cols={5} />
        ) : (
          <div className="overflow-x-auto border border-linha bg-white">
            <table className="w-full min-w-[860px] text-left text-[14px]">
              <thead className="border-b border-linha text-[12px] uppercase tracking-[0.08em] text-texto-2">
                <tr>
                  <th className="px-4 py-3 font-normal">Pessoa</th>
                  <th className="px-3 font-normal">Papel</th>
                  <th className="px-3 font-normal">Segurança</th>
                  <th className="px-3 font-normal">Último acesso</th>
                  <th className="px-4 text-right font-normal">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-b border-linha last:border-0">
                      <td className="px-4 py-3">
                        {u.name ?? "—"}
                        {self && <span className="label-sm ml-2 bg-bege px-1.5 text-[9px]">você</span>}
                        <span className="block text-[12px] text-texto-2">{u.email}</span>
                      </td>
                      <td className="px-3">
                        {self ? (
                          ROLE_LABEL[u.role]
                        ) : (
                          <select aria-label={`Papel de ${u.email}`} className="h-9 border border-linha-forte bg-white px-2" value={u.role} onChange={(e) => void act(u, "role", e.target.value as AdminRole)}>
                            {ADMIN_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 text-[13px]">
                        <span className={cn(u.mfa ? "text-oliva-escuro" : "text-[#8a5a12]")}>{u.mfa ? "2º fator ativo" : "Sem 2º fator ainda"}</span>
                        {u.mustChangePassword && <span className="block text-[12px] text-texto-2">senha provisória</span>}
                      </td>
                      <td className="px-3 text-[13px] text-texto-2">{u.lastAdminLoginAt ? fmt.format(new Date(u.lastAdminLoginAt)) : "nunca entrou"}</td>
                      <td className="px-4 text-right">
                        {self ? (
                          <span className="text-[12px] text-texto-2">—</span>
                        ) : (
                          <div className="flex justify-end gap-3 text-[13px]">
                            <button type="button" className="underline hover:text-oliva" onClick={() => void act(u, "reset-password")}>
                              Nova senha
                            </button>
                            {u.mfa && (
                              <button type="button" className="underline hover:text-oliva" onClick={() => void act(u, "reset-mfa")}>
                                Redefinir 2º fator
                              </button>
                            )}
                            <button type="button" className="text-erro underline" onClick={() => void act(u, "remove")}>
                              Tirar acesso
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {secret && <SecretDialog email={secret.email} password={secret.password} onClose={() => setSecret(null)} />}
    </>
  );
}

/** Mostra a senha provisória UMA vez (não fica salva em lugar nenhum do painel). */
function SecretDialog({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog ref={ref} onCancel={(e) => (e.preventDefault(), onClose())} aria-labelledby="senha-titulo" className="w-[min(480px,calc(100vw-2rem))] bg-offwhite p-0 text-texto backdrop:bg-preto/50">
      <div className="p-6">
        <h2 id="senha-titulo" className="font-display text-[28px] leading-tight">
          Senha provisória
        </h2>
        <p className="mt-2 text-[14px] font-light text-texto-3">
          Repasse para <strong className="font-normal">{email}</strong> por um canal seguro (pessoalmente ou mensagem direta). Ela não será mostrada de novo.
        </p>
        <p className="mt-5 select-all break-all border border-linha bg-white px-4 py-3 font-mono text-[18px]">{password}</p>
        <p className="mt-3 text-[13px] text-texto-2">Acesso: {typeof window !== "undefined" ? window.location.origin : ""}/admin/login</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="btn-secondary h-11 px-5"
            onClick={() => {
              void navigator.clipboard?.writeText(password).then(() => setCopied(true));
            }}
          >
            {copied ? "Copiada" : "Copiar senha"}
          </button>
          <button type="button" className="btn-primary h-11 px-5" onClick={onClose}>
            Pronto
          </button>
        </div>
      </div>
    </dialog>
  );
}
