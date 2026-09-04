"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Pencil, Trash2, X } from "lucide-react";
import {
  addCategoryAction,
  renameCategoryAction,
  setCategoryActiveAction,
  removeCategoryAction,
  moveCategoryAction,
} from "@/modules/admin/categories-actions";

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  productCount: number;
}

export default function CategoriesManager({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const field =
    "bg-transparent border border-line px-4 py-3 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="flex gap-3 mb-8">
        <input
          className={field + " flex-1"}
          placeholder="New category - e.g. Anklets"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              run(() => addCategoryAction(newName));
              setNewName("");
            }
          }}
        />
        <button
          onClick={() => {
            run(() => addCategoryAction(newName));
            setNewName("");
          }}
          disabled={pending || newName.trim().length < 2}
          className="bg-ink text-bone px-8 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          ADD
        </button>
      </div>

      {error && <p className="mb-6 text-sm text-red-800">{error}</p>}

      <div className="border border-line">
        {categories.map((c, i) => (
          <div
            key={c.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0"
          >
            <div className="flex flex-col">
              <button
                onClick={() => run(() => moveCategoryAction(c.id, "up"))}
                disabled={pending || i === 0}
                className="text-ink-soft hover:text-ink disabled:opacity-20 transition-colors"
                aria-label="Move up"
              >
                <ArrowUp size={13} />
              </button>
              <button
                onClick={() => run(() => moveCategoryAction(c.id, "down"))}
                disabled={pending || i === categories.length - 1}
                className="text-ink-soft hover:text-ink disabled:opacity-20 transition-colors"
                aria-label="Move down"
              >
                <ArrowDown size={13} />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              {editing === c.id ? (
                <div className="flex gap-2">
                  <input
                    className={field + " flex-1 py-2"}
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        run(() => renameCategoryAction(c.id, editName));
                        setEditing(null);
                      }
                      if (e.key === "Escape") setEditing(null);
                    }}
                  />
                  <button
                    onClick={() => {
                      run(() => renameCategoryAction(c.id, editName));
                      setEditing(null);
                    }}
                    className="p-2 text-ink-soft hover:text-ink transition-colors"
                    aria-label="Save"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="p-2 text-ink-soft hover:text-ink transition-colors"
                    aria-label="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm">
                    {c.name}
                    {!c.isActive && (
                      <span className="ml-2 text-[10px] tracking-[0.15em] text-ink-soft">
                        HIDDEN
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-soft">
                    /{c.slug} · {c.productCount}{" "}
                    {c.productCount === 1 ? "product" : "products"}
                  </p>
                </>
              )}
            </div>

            {editing !== c.id && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditing(c.id);
                    setEditName(c.name);
                  }}
                  className="p-2 text-ink-soft hover:text-ink transition-colors"
                  aria-label="Rename"
                >
                  <Pencil size={15} />
                </button>

                <button
                  onClick={() =>
                    run(() => setCategoryActiveAction(c.id, !c.isActive))
                  }
                  disabled={pending}
                  className="p-2 text-ink-soft hover:text-ink transition-colors disabled:opacity-40"
                  aria-label={c.isActive ? "Hide" : "Show"}
                >
                  {c.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>

                <button
                  onClick={() => run(() => removeCategoryAction(c.id))}
                  disabled={pending || c.productCount > 0}
                  title={
                    c.productCount > 0
                      ? "Move or delete its products first"
                      : "Delete"
                  }
                  className="p-2 text-ink-soft hover:text-red-800 transition-colors disabled:opacity-20"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-ink-soft leading-relaxed">
        Hiding a category removes it from the store filters and from the product
        form, but products already in it keep working. A category can only be
        deleted once it is empty.
      </p>
    </div>
  );
}