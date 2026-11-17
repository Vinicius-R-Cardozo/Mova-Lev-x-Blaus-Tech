"use client";
import { useEffect, useState, type FormEvent } from "react";
import { profileUpdateSchema } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Field } from "@/components/checkout/Field";

export default function DadosPage() {
  const auth = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", cpf: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (auth.profile) setForm({ name: auth.profile.name ?? "", phone: auth.profile.phone ?? "", cpf: auth.profile.cpf ?? "" });
  }, [auth.profile]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse({ name: form.name || undefined, phone: form.phone, cpf: form.cpf });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      return setErrors(errs);
    }
    setErrors({});
    try {
      await auth.apiFetch("/me", { method: "PATCH", body: JSON.stringify(parsed.data) });
      await auth.refreshProfile();
      setMessage("Dados salvos.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <section aria-labelledby="dados-titulo">
      <h1 id="dados-titulo" className="text-h2-sm md:text-[56px]">Dados pessoais</h1>
      <form onSubmit={save} noValidate className="mt-8 grid max-w-xl gap-5">
        <Field label="E-mail" name="email" value={auth.session?.user.email ?? ""} readOnly hint="O e-mail é o seu acesso e não pode ser alterado aqui." />
        <Field label="Nome completo" name="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Field label="Celular com DDD" name="phone" type="tel" autoComplete="tel-national" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
        <Field label="CPF" name="cpf" inputMode="numeric" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} error={errors.cpf} />
        <button type="submit" className="btn-primary justify-self-start">Salvar</button>
        <p role="status" className="text-body-sm text-oliva">{message}</p>
      </form>
    </section>
  );
}
