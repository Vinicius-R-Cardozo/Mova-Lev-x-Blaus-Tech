"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminLoginSchema, adminPasswordSchema } from "@movalev/shared";
import { BrandMark } from "@/components/brand/BrandMark";
import { getSupabase } from "@/lib/auth";
import { API_URL } from "@/lib/site";

type Step = "senha" | "mfa-cadastro" | "mfa-codigo" | "nova-senha" | "esqueci" | "esqueci-ok";
type LoginResponse = { accessToken: string; refreshToken: string; mustChangePassword: boolean; mfaEnrolled: boolean; mfaRequired: boolean };

const MOTIVO: Record<string, string> = {
  expirada: "Sua sessão do painel expirou. Entre de novo.",
  inatividade: "Você saiu por inatividade. Entre de novo.",
  mfa: "Confirme o código do aplicativo autenticador para continuar.",
  sem_acesso: "Esta conta não tem acesso ao painel.",
  senha: "Senha redefinida. Entre com a nova senha.",
};

/** Só caminhos internos do painel (evita redirecionamento para fora). */
const safeNext = (n: string | null) => (n && n.startsWith("/admin") && !n.startsWith("//") && !n.startsWith("/admin/login") ? n : "/admin");

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const motivo = params.get("motivo");
  const [step, setStep] = useState<Step>("senha");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mustChange, setMustChange] = useState(false);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);

  // Ao abrir: sessão vencida/sem acesso → sai; já logado só com senha → vai direto ao código.
  useEffect(() => {
    void (async () => {
      const supabase = await getSupabase();
      if (!supabase) return;
      if (motivo === "expirada" || motivo === "sem_acesso" || motivo === "inatividade") {
        await supabase.auth.signOut();
        return;
      }
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel === "aal1" && data.nextLevel === "aal2") {
        const factors = await supabase.auth.mfa.listFactors();
        const f = factors.data?.totp.find((x) => x.status === "verified");
        if (f) {
          setFactorId(f.id);
          setStep("mfa-codigo");
        }
      }
    })();
  }, [motivo]);

  const finish = () => window.location.assign(next);

  const afterMfa = () => (mustChange ? setStep("nova-senha") : finish());

  async function startEnrollment() {
    const supabase = await getSupabase();
    if (!supabase) throw new Error("Login indisponível.");
    // Cadastros abandonados (não confirmados) impedem um novo: remove antes.
    const list = await supabase.auth.mfa.listFactors();
    for (const f of list.data?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Painel MOVA LEV ${new Date().toLocaleDateString("pt-BR")}` });
    if (err || !data) throw new Error("Não foi possível iniciar o cadastro do autenticador.");
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setStep("mfa-cadastro");
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    const parsed = adminLoginSchema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Confira os dados.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = (await res.json()) as LoginResponse & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Não foi possível entrar.");
      const supabase = await getSupabase();
      if (!supabase) throw new Error("Login indisponível.");
      const { error: err } = await supabase.auth.setSession({ access_token: data.accessToken, refresh_token: data.refreshToken });
      if (err) throw new Error("Não foi possível abrir a sessão.");
      setMustChange(data.mustChangePassword);
      setPassword("");
      if (!data.mfaRequired) return data.mustChangePassword ? setStep("nova-senha") : finish();
      if (data.mfaEnrolled) {
        const factors = await supabase.auth.mfa.listFactors();
        const f = factors.data?.totp.find((x) => x.status === "verified");
        if (!f) throw new Error("Autenticador não encontrado.");
        setFactorId(f.id);
        setStep("mfa-codigo");
      } else {
        await startEnrollment();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const id = step === "mfa-cadastro" ? enroll?.factorId : factorId;
    if (!id || !/^\d{6}$/.test(code)) return setError("Digite os 6 números do aplicativo.");
    setBusy(true);
    setError(null);
    try {
      const supabase = await getSupabase();
      const { error: err } = await supabase!.auth.mfa.challengeAndVerify({ factorId: id, code });
      if (err) throw new Error(err.status === 429 ? "Muitas tentativas. Aguarde um pouco." : "Código incorreto ou expirado.");
      setCode("");
      afterMfa();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código incorreto.");
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    const parsed = adminPasswordSchema.safeParse({ password: newPass });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Senha inválida.");
    if (newPass !== newPass2) return setError("As senhas não conferem.");
    setBusy(true);
    setError(null);
    try {
      const supabase = await getSupabase();
      const token = (await supabase!.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_URL}/auth/admin/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error(((await res.json()) as { message?: string }).message ?? "Não foi possível trocar a senha.");
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível trocar a senha.");
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!adminLoginSchema.shape.email.safeParse(email).success) return setError("Informe o e-mail do painel.");
    setBusy(true);
    setError(null);
    const supabase = await getSupabase();
    // Resposta igual exista ou não a conta (não revela quem é da equipe).
    await supabase?.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/admin/redefinir-senha` });
    setBusy(false);
    setStep("esqueci-ok");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bege/50 px-4 py-12">
      <div className="w-full max-w-[420px] border border-linha bg-offwhite p-7 md:p-9">
        <BrandMark variant="wordmark" decorative className="h-6" />
        <p className="label-sm mt-2 text-texto-2">Painel</p>

        {motivo && MOTIVO[motivo] && step === "senha" && <p className="mt-6 border-l-2 border-taupe bg-white px-4 py-3 text-[14px] font-light">{MOTIVO[motivo]}</p>}
        {error && (
          <p role="alert" className="mt-6 border-l-2 border-erro bg-white px-4 py-3 text-[14px] text-erro">
            {error}
          </p>
        )}

        {step === "senha" && (
          <form onSubmit={submitPassword} className="mt-6 space-y-4" noValidate>
            <h1 className="font-display text-[34px] leading-none">Entrar</h1>
            <Field label="E-mail" type="email" autoComplete="username" value={email} onChange={setEmail} autoFocus />
            <Field label="Senha" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </button>
            <button type="button" className="link-underline text-[14px]" onClick={() => (setError(null), setStep("esqueci"))}>
              Esqueci a senha
            </button>
          </form>
        )}

        {step === "mfa-cadastro" && enroll && (
          <form onSubmit={submitCode} className="mt-6 space-y-4" noValidate>
            <h1 className="font-display text-[34px] leading-none">Proteja seu acesso</h1>
            <p className="text-[14px] font-light text-texto-3">
              Abra um app autenticador (Google Authenticator, Microsoft Authenticator, 1Password…), leia o QR code e digite o código de 6 números.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- QR em data URL gerado pelo Supabase */}
            <img src={enroll.qr} alt="QR code para o aplicativo autenticador" width={180} height={180} className="mx-auto bg-white p-2" />
            <details className="text-[13px] text-texto-2">
              <summary className="cursor-pointer">Não consigo ler o QR code</summary>
              <p className="mt-2 break-all font-mono text-[13px] text-texto">{enroll.secret}</p>
            </details>
            <CodeField value={code} onChange={setCode} />
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Confirmando…" : "Confirmar e ativar"}
            </button>
          </form>
        )}

        {step === "mfa-codigo" && (
          <form onSubmit={submitCode} className="mt-6 space-y-4" noValidate>
            <h1 className="font-display text-[34px] leading-none">Código de acesso</h1>
            <p className="text-[14px] font-light text-texto-3">Digite os 6 números que aparecem no seu aplicativo autenticador.</p>
            <CodeField value={code} onChange={setCode} />
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Confirmando…" : "Confirmar"}
            </button>
          </form>
        )}

        {step === "nova-senha" && (
          <form onSubmit={submitNewPassword} className="mt-6 space-y-4" noValidate>
            <h1 className="font-display text-[34px] leading-none">Crie sua senha</h1>
            <p className="text-[14px] font-light text-texto-3">A senha provisória precisa ser trocada. Use 10 caracteres ou mais, com letras e números.</p>
            <Field label="Nova senha" type="password" autoComplete="new-password" value={newPass} onChange={setNewPass} autoFocus />
            <Field label="Repita a nova senha" type="password" autoComplete="new-password" value={newPass2} onChange={setNewPass2} />
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Salvando…" : "Salvar e entrar"}
            </button>
          </form>
        )}

        {step === "esqueci" && (
          <form onSubmit={submitForgot} className="mt-6 space-y-4" noValidate>
            <h1 className="font-display text-[34px] leading-none">Redefinir senha</h1>
            <p className="text-[14px] font-light text-texto-3">Enviaremos um link para criar uma nova senha.</p>
            <Field label="E-mail" type="email" autoComplete="username" value={email} onChange={setEmail} autoFocus />
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Enviando…" : "Enviar link"}
            </button>
            <button type="button" className="link-underline text-[14px]" onClick={() => setStep("senha")}>
              Voltar
            </button>
          </form>
        )}

        {step === "esqueci-ok" && (
          <div className="mt-6 space-y-4">
            <h1 className="font-display text-[34px] leading-none">Confira seu e-mail</h1>
            <p className="text-[14px] font-light text-texto-3">Se este e-mail for da equipe, o link para criar uma nova senha chega em alguns minutos.</p>
            <button type="button" className="link-underline text-[14px]" onClick={() => setStep("senha")}>
              Voltar ao login
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] text-texto-2">
        {label}
      </label>
      <input id={id} className="input h-12 bg-white" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

function CodeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="codigo" className="mb-1.5 block text-[13px] text-texto-2">
        Código de 6 números
      </label>
      <input
        id="codigo"
        className="input h-14 bg-white text-center font-mono text-[24px] tracking-[0.4em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        autoFocus
      />
    </div>
  );
}
