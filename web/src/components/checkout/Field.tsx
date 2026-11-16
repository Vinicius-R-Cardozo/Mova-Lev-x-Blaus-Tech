import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

/** Campo do checkout: label acima, erro ligado por aria-describedby. */
export const Field = forwardRef<HTMLInputElement, Props>(function Field({ label, error, hint, id, className, ...rest }, ref) {
  const fieldId = id ?? `f-${rest.name}`;
  const describedBy = [error ? `${fieldId}-erro` : null, hint ? `${fieldId}-dica` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-2 block text-[13px] font-normal text-texto-2">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          "h-[54px] w-full border bg-white px-4 text-[16px] font-light text-texto placeholder:text-texto-2/70 focus:border-preto focus:outline-none",
          error ? "border-erro" : "border-linha-forte",
        )}
        {...rest}
      />
      {hint && !error && (
        <p id={`${fieldId}-dica`} className="mt-1.5 text-[13px] font-light text-texto-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-erro`} className="mt-1.5 text-[13px] text-erro">
          {error}
        </p>
      )}
    </div>
  );
});
