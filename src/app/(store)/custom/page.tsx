import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { listProductTypes } from "@/modules/catalog/service";
import CustomRequestForm from "./custom-request-form";

export default async function CustomPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?next=/custom");

  const [slaMin, slaMax, types] = await Promise.all([
    getSetting("quoteSlaDaysMin", "1"),
    getSetting("quoteSlaDaysMax", "3"),
    listProductTypes(),
  ]);

  return (
    <div className="px-6 lg:px-12 py-16 lg:py-24">
      <div className="max-w-2xl">
        <p className="text-[10px] tracking-[0.3em] text-ink-soft mb-3">
          MADE FOR YOU
        </p>
        <h1 className="font-display text-4xl lg:text-5xl font-light mb-4">
          Something of your own
        </h1>
        <p className="text-sm text-ink-soft leading-relaxed mb-12 max-w-lg">
          Start from one of our pieces and tell us what to change, or describe
          something new. We&apos;ll come back with a price and a timeline within{" "}
          {slaMin}–{slaMax} days. Nothing is charged until you accept.
        </p>

        <CustomRequestForm
          categories={types.map((t) => ({ id: t.id, name: t.name }))}
        />
      </div>
    </div>
  );
}