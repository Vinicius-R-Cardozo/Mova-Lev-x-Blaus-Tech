import Link from "next/link";
import type { SiteContent } from "@movalev/shared";

/** Barra de aviso acima do topo (Conteúdo › Site). Só aparece quando ligada. */
export function AnnouncementBar({ announcement, fill }: { announcement: SiteContent["announcement"]; fill: (text: string) => string }) {
  const text = fill(announcement.text).trim();
  if (!announcement.enabled || !text) return null;
  const cls = "container-site flex min-h-9 items-center justify-center py-2 text-center text-[12px] tracking-[0.06em] md:text-[13px]";
  const external = /^https?:/i.test(announcement.href);
  return (
    <div className="bg-preto text-offwhite">
      {announcement.href ? (
        <Link href={announcement.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`${cls} hover:underline hover:underline-offset-4`}>
          {text}
        </Link>
      ) : (
        <p className={cls}>{text}</p>
      )}
    </div>
  );
}
