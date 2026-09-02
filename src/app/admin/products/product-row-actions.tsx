"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toggleHiddenAction } from "@/modules/admin/products-actions";

export default function ProductRowActions({
  id,
  isHidden,
}: {
  id: string;
  isHidden: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await toggleHiddenAction(id, !isHidden);
          router.refresh();
        })
      }
      disabled={pending}
      className="text-ink-soft hover:text-ink transition-colors shrink-0 p-2 disabled:opacity-40"
      title={isHidden ? "Show in store" : "Hide from store"}
    >
      {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}