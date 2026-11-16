import { BADGE_LABEL, type Badge as BadgeKind } from "@movalev/shared";

export function Badge({ badge }: { badge: BadgeKind }) {
  return <span className="label-sm inline-block bg-offwhite px-2.5 py-2 text-[10px] text-preto">{BADGE_LABEL[badge]}</span>;
}
