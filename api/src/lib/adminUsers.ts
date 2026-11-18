import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { supabaseAdmin } from "./supabase";

export type StaffRole = "ADMIN" | "EDITOR";

/** Senha provisória: 16 caracteres sem ambíguos, sempre com letra e número. */
export function tempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  const s = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${s.slice(0, 14)}${2 + (bytes[0]! % 8)}k`;
}

/** Acha o usuário do Supabase Auth pelo e-mail (perfil primeiro; senão, varre a lista). */
export async function findAuthUserId(email: string): Promise<string | null> {
  const profile = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
  if (profile) return profile.id;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Cria a conta (ou promove uma existente) com papel da equipe e senha provisória.
 * O papel fica no banco (fonte da verdade) e no app_metadata do token.
 */
export async function createOrPromoteStaff(email: string, name: string | null, role: StaffRole): Promise<{ id: string; password: string; created: boolean }> {
  const password = tempPassword();
  const auth = supabaseAdmin().auth.admin;
  let id = await findAuthUserId(email);
  let created = false;
  if (id) {
    const { error } = await auth.updateUserById(id, { password, email_confirm: true, app_metadata: { role } });
    if (error) throw error;
  } else {
    const { data, error } = await auth.createUser({ email, password, email_confirm: true, app_metadata: { role } });
    if (error || !data.user) throw error ?? new Error("Não foi possível criar o usuário.");
    id = data.user.id;
    created = true;
  }
  await prisma.profile.upsert({
    where: { id },
    create: { id, email, name, role, mustChangePassword: true },
    update: { role, mustChangePassword: true, ...(name ? { name } : {}) },
  });
  return { id, password, created };
}

/** Atualiza o papel no banco e no token (app_metadata). */
export async function setRole(id: string, role: "ADMIN" | "EDITOR" | "CUSTOMER") {
  await prisma.profile.update({ where: { id }, data: { role } });
  const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { app_metadata: { role } });
  if (error) throw error;
}
