export function AnnouncementBar() {
  return (
    <div className="flex h-announce items-center justify-center overflow-hidden bg-preto px-4 text-offwhite">
      <p className="label-sm truncate text-center">
        Frete grátis acima de R$ 299<span className="hidden sm:inline"> · Troca grátis em 30 dias · 10% na 1ª compra</span>
        <span className="sm:hidden"> · Troca grátis</span>
      </p>
    </div>
  );
}
