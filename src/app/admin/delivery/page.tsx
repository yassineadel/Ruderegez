import { requirePagePermission } from "@/lib/auth-guards";
import { listAllZones } from "@/modules/delivery/service";
import { fromMinor, type Minor } from "@/lib/money";
import ZonesManager from "./zones-manager";

export default async function AdminDeliveryPage() {
  await requirePagePermission("SETTINGS");
  const zones = await listAllZones();

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Delivery areas</h1>
      <p className="text-sm text-ink-soft mb-10 max-w-xl leading-relaxed">
        The areas customers can choose at checkout, each with its own delivery
        fee. A change applies to new checkouts straight away - placed orders
        keep the area and fee they were placed with. Switch an area off to hide
        it without losing its fee. Collection from the store is always free.
      </p>

      <ZonesManager
        zones={zones.map((z) => ({
          id: z.id,
          name: z.name,
          feeEgp: fromMinor(z.feeMinor as Minor),
          isActive: z.isActive,
        }))}
      />
    </>
  );
}
