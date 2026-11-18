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
import { prisma } from "../src/lib/prisma";
import { createOrPromoteStaff } from "../src/lib/adminUsers";

const [emailArg, nameArg, roleArg = "ADMIN"] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const role = roleArg.toUpperCase() as "ADMIN" | "EDITOR";

async function main() {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Uso: npm run admin:criar -w @movalev/api -- email@dominio.com "Nome" [ADMIN|EDITOR]');
  if (role !== "ADMIN" && role !== "EDITOR") throw new Error("Papel deve ser ADMIN ou EDITOR.");
  const { id, password } = await createOrPromoteStaff(email, nameArg || null, role);
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
