/**
 * Cria (ou promove) um usuário do painel com senha provisória.
 *
 *   npm run admin:criar -w @movalev/api -- email@dominio.com "Nome" [ADMIN|EDITOR]
 *
 * - Cria a conta no Supabase Auth já confirmada (ou reaproveita a existente).
 * - Define uma senha provisória aleatória (mostrada uma única vez aqui).
 * - Marca o papel no banco (fonte da verdade) e no app_metadata do token.
 * - No 1º acesso a pessoa cadastra o 2º fator e troca a senha (obrigatório).
 */
import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { supabaseAdmin } from "../src/lib/supabase";

const [emailArg, nameArg, roleArg = "ADMIN"] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const role = roleArg.toUpperCase();

function tempPassword(): string {
  // 16 caracteres sem ambíguos, garantindo letra e número.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  const s = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${s.slice(0, 14)}${2 + (bytes[0]! % 8)}k`;
}

async function findUserId(addr: string): Promise<string | null> {
  const profile = await prisma.profile.findUnique({ where: { email: addr }, select: { id: true } });
  if (profile) return profile.id;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === addr);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Uso: npm run admin:criar -w @movalev/api -- email@dominio.com "Nome" [ADMIN|EDITOR]');
  if (role !== "ADMIN" && role !== "EDITOR") throw new Error("Papel deve ser ADMIN ou EDITOR.");
  const password = tempPassword();
  const auth = supabaseAdmin().auth.admin;

  let id = await findUserId(email);
  if (id) {
    const { error } = await auth.updateUserById(id, { password, email_confirm: true, app_metadata: { role } });
    if (error) throw error;
  } else {
    const { data, error } = await auth.createUser({ email, password, email_confirm: true, app_metadata: { role } });
    if (error || !data.user) throw error ?? new Error("Não foi possível criar o usuário.");
    id = data.user.id;
  }

  await prisma.profile.upsert({
    where: { id },
    create: { id, email, name: nameArg || null, role, mustChangePassword: true },
    update: { role, mustChangePassword: true, ...(nameArg ? { name: nameArg } : {}) },
  });
  await prisma.auditLog.create({
    data: { actorEmail: "script admin:criar", actorRole: "ADMIN", action: "user.create", entity: "usuario", entityId: id, summary: `${email} agora é ${role === "ADMIN" ? "Administrador" : "Editor"} (senha provisória)` },
  });

  console.log(`\n✔ ${email} pronto como ${role}.`);
  console.log(`  Senha provisória: ${password}`);
  console.log("  Entre em /admin/login, cadastre o app autenticador e troque a senha no 1º acesso.\n");
}

main()
  .catch((err) => {
    console.error(`\n✖ ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
