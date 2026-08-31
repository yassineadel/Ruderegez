import Link from "next/link";
import { listProducts, listProductTypes } from "@/modules/catalog/service";
import ProductCard from "@/components/product-card";

const PAGE_SIZE = 24;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; audience?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const audience =
    params.audience === "MEN" || params.audience === "WOMEN"
      ? params.audience
      : undefined;

  const [{ products, total }, types] = await Promise.all([
    listProducts({
      typeSlug: params.type,
      audience,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    listProductTypes(),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);

  function href(next: Record<string, string | undefined>) {
    const q = new URLSearchParams();
    const merged = { type: params.type, audience: params.audience, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/products?${s}` : "/products";
  }

  return (
    <div className="px-6 py-16 lg:px-12 lg:py-24">
      <h1 className="font-display text-5xl font-light mb-2">Jewellery</h1>
      <p className="text-sm text-ink-soft mb-12">
        {total} {total === 1 ? "piece" : "pieces"}
      </p>

      <div className="flex flex-wrap gap-x-6 gap-y-3 mb-4 text-xs tracking-[0.15em]">
        <Filter href={href({ type: undefined, page: undefined })} active={!params.type}>
          ALL
        </Filter>
        {types.map((t) => (
          <Filter
            key={t.id}
            href={href({ type: t.slug, page: undefined })}
            active={params.type === t.slug}
          >
            {t.name.toUpperCase()}
          </Filter>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3 mb-12 text-xs tracking-[0.15em]">
        <Filter href={href({ audience: undefined, page: undefined })} active={!audience}>
          EVERYONE
        </Filter>
        <Filter href={href({ audience: "WOMEN", page: undefined })} active={audience === "WOMEN"}>
          WOMEN
        </Filter>
        <Filter href={href({ audience: "MEN", page: undefined })} active={audience === "MEN"}>
          MEN
        </Filter>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-ink-soft py-24">
          Nothing here yet. Try another category.
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex gap-2 mt-20 justify-center text-xs">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href({ page: String(n) })}
              className={
                "px-4 py-2.5 border transition-colors " +
                (n === page
                  ? "border-ink bg-ink text-bone"
                  : "border-line hover:border-ink")
              }
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Filter({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "pb-1 border-b transition-colors " +
        (active ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}