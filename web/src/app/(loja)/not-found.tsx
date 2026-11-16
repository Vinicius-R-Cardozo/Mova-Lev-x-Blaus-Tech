import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-site flex min-h-[60vh] flex-col items-start justify-center py-24">
      <p className="label text-texto-2">Erro 404</p>
      <h1 className="mt-4 text-h2-sm md:text-h2">
        Essa página <em>saiu para respirar.</em>
      </h1>
      <p className="mt-4 max-w-md text-body font-light text-texto-3">O endereço pode ter mudado ou a peça não está mais disponível.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">Voltar ao início</Link>
        <Link href="/colecao/novidades" className="btn-secondary">Ver novidades</Link>
      </div>
    </div>
  );
}
