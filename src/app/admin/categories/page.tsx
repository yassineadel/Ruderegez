import { listCategories } from "@/modules/admin/categories-service";
import CategoriesManager from "./categories-manager";

export default async function AdminCategoriesPage() {
  const categories = await listCategories();

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Categories</h1>
      <p className="text-sm text-ink-soft mb-10 max-w-xl">
        These appear in the store filters and when adding a product. The order
        here is the order customers see.
      </p>

      <CategoriesManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          isActive: c.isActive,
          productCount: c._count.products,
        }))}
      />
    </>
  );
}

