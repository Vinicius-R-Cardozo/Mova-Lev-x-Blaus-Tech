"use client";
import { useConsent } from "@/lib/consent";

export function CookiePreferencesLink({ className, label = "ajustar preferências de cookies" }: { className?: string; label?: string }) {
  const { openPreferences } = useConsent();
  return (
    <button type="button" onClick={openPreferences} className={className ?? "underline decoration-1 underline-offset-4 hover:text-oliva"}>
      {label}
    </button>
  );
}
