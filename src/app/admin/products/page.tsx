import Link from "next/link";
import { listAdminProducts } from "@/modules/admin/products-service";
import { getPricingSettings } from "@/lib/settings";
import { priceProduct } from "@/modules/pricing/price-product";
import { formatEGP } from "@/lib/money";
import ProductRowActions from "./product-row-actions";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; visibility?: string; type?: string }>;
}) {
  const params = await searchParams;
  const hidden =
    params.visibility === "hidden"
      ? true
      : params.visibility === "visible"
        ? false
        : undefined;

  const [{ products, types }, settings] = await Promise.all([
    listAdminProducts({ search: params.q, hidden, typeSlug: params.type }),
    getPricingSettings(),
  ]);

  return (
    <>
      <div className="flex items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="font-display text-4xl font-light mb-2">Products</h1>
          <p className="text-sm text-ink-soft">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-ink text-bone px-8 py-3.5 text-xs tracking-[0.2em] hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          NEW PRODUCT
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8 text-xs tracking-[0.12em]">
        <Filter href="/admin/products" active={hidden === undefined}>
          ALL
        </Filter>
        <Filter href="/admin/products?visibility=visible" active={hidden === false}>
          VISIBLE
        </Filter>
        <Filter href="/admin/products?visibility=hidden" active={hidden === true}>
          HIDDEN
        </Filter>
        <span className="text-line">|</span>
        {types.map((t) => (
          <Filter
            key={t.id}
            href={`/admin/products?type=${t.slug}`}
            active={params.type === t.slug}
          >
            {t.name.toUpperCase()}
          </Filter>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-ink-soft py-16">
          Nothing here.{" "}
          <Link href="/admin/products/new" className="text-ink underline underline-offset-4">
            Add your first product
          </Link>
          .
        </p>
      ) : (
        <div className="border border-line">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 px-4 py-3 border-b border-line last:border-0 hover:bg-bone-deep transition-colors"
            >
              <div className="w-12 aspect-[4/5] bg-bone-deep shrink-0 overflow-hidden">
                {p.images[0] && (
                  <img
                    src={p.images[0].url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <Link href={`/admin/products/${p.id}`} className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {p.name}
                  {p.isHidden && (
                    <span className="ml-2 text-[10px] tracking-[0.15em] text-ink-soft">
                      HIDDEN
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-soft truncate">
                  {p.type.name} ·{" "}
                  {p.isFlatPrice
                    ? "fixed price"
                    : `${(p.weightMg / 1000).toFixed(1)}g · ${(p.factorBp / 10000).toFixed(1)}×`}
                  {p._count.sizes > 0 && ` · ${p._count.sizes} sizes`}
                </p>
              </Link>

              <p className="text-sm shrink-0 hidden sm:block">
                {formatEGP(priceProduct(p, settings))}
              </p>

              <ProductRowActions id={p.id} isHidden={p.isHidden} />
            </div>
          ))}
        </div>
      )}
    </>
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
        (active ? "border-ink" : "border-transparent text-ink-soft hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}