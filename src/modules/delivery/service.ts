import type { Minor } from "@/lib/money";
import { toMinor } from "@/lib/money";
import { requirePermission } from "@/lib/auth-guards";
import {
  findActiveZones,
  findAllZones,
  findZoneById,
  findZoneByName,
  nextSortOrder,
  createZoneRow,
  updateZoneRow,
  deleteZoneRow,
  setZoneOrder,
} from "./repository";

export interface ZoneOption {
  id: string;
  name: string;
  feeMinor: Minor;
}

// ============================================================================
//  STOREFRONT
// ============================================================================

/** The areas a customer can choose at checkout, in the admin's order. */
export async function listDeliveryZones(): Promise<ZoneOption[]> {
  const rows = await findActiveZones();
  return rows.map((z) => ({ id: z.id, name: z.name, feeMinor: z.feeMinor as Minor }));
}

/** For placeOrder: the area the customer picked, if it still exists and is on. */
export async function getActiveZone(id: string): Promise<ZoneOption | null> {
  const z = await findZoneById(id);
  if (!z || !z.isActive) return null;
  return { id: z.id, name: z.name, feeMinor: z.feeMinor as Minor };
}

// ============================================================================
//  ADMIN  -  part of the SETTINGS section
// ============================================================================

export async function listAllZones() {
  await requirePermission("SETTINGS");
  return findAllZones();
}

export async function createZone(input: { name: string; feeEgp: number }) {
  const admin = await requirePermission("SETTINGS");
  const name = cleanName(input.name);
  const feeMinor = cleanFee(input.feeEgp);

  if (await findZoneByName(name)) throw new Error("ZONE_NAME_TAKEN");

  return createZoneRow({ name, feeMinor, sortOrder: await nextSortOrder(), actorUserId: admin.id });
}

export async function updateZone(input: {
  id: string;
  name?: string;
  feeEgp?: number;
  isActive?: boolean;
}) {
  const admin = await requirePermission("SETTINGS");
  const zone = await findZoneById(input.id);
  if (!zone) throw new Error("ZONE_NOT_FOUND");

  const name = input.name !== undefined ? cleanName(input.name) : zone.name;
  const feeMinor = input.feeEgp !== undefined ? cleanFee(input.feeEgp) : zone.feeMinor;
  const isActive = input.isActive ?? zone.isActive;

  if (name.toLowerCase() !== zone.name.toLowerCase()) {
    const clash = await findZoneByName(name);
    if (clash && clash.id !== zone.id) throw new Error("ZONE_NAME_TAKEN");
  }

  if (name === zone.name && feeMinor === zone.feeMinor && isActive === zone.isActive) return;

  await updateZoneRow({
    id: zone.id,
    before: { name: zone.name, feeMinor: zone.feeMinor, isActive: zone.isActive },
    after: { name, feeMinor, isActive },
    actorUserId: admin.id,
  });
}

/**
 * Always allowed: orders keep their own copy of the area's name and fee, so
 * nothing points at this row. A customer mid-checkout with it selected is
 * asked to choose again.
 */
export async function deleteZone(id: string) {
  const admin = await requirePermission("SETTINGS");
  const zone = await findZoneById(id);
  if (!zone) throw new Error("ZONE_NOT_FOUND");
  await deleteZoneRow({
    id,
    before: { name: zone.name, feeMinor: zone.feeMinor },
    actorUserId: admin.id,
  });
}

/** Moves an area one place up or down the checkout list. */
export async function moveZone(id: string, direction: "up" | "down") {
  await requirePermission("SETTINGS");
  const ids = (await findAllZones()).map((z) => z.id);
  const from = ids.indexOf(id);
  if (from === -1) throw new Error("ZONE_NOT_FOUND");
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await setZoneOrder(ids);
}

// ---------------------------------------------------------------------------

function cleanName(raw: string): string {
  const name = (raw ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) throw new Error("ZONE_NAME_INVALID");
  return name;
}

function cleanFee(feeEgp: number): number {
  if (!Number.isFinite(feeEgp) || feeEgp < 0 || feeEgp > 10000) {
    throw new Error("ZONE_FEE_INVALID");
  }
  return toMinor(feeEgp);
}
