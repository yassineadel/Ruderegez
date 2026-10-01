import { NextResponse } from "next/server";
import { requireUser, requirePermission } from "@/lib/auth-guards";
import { createUploadSignature, type UploadFolder } from "@/lib/cloudinary";

/**
 * Who may upload into which folder. Customers upload payment receipts,
 * custom-request photos and review photos; the admin folders need the section
 * that uses them, so staff with that section can upload too.
 */
const GUARDS: Record<UploadFolder, () => Promise<unknown>> = {
  payments: requireUser,
  designs: requireUser,
  reviews: requireUser,
  products: () => requirePermission("PRODUCTS"),
  homepage: () => requirePermission("HOMEPAGE"),
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const folder = body.folder as UploadFolder;

  if (!Object.hasOwn(GUARDS, folder)) {
    return NextResponse.json({ error: "Unknown folder" }, { status: 400 });
  }

  try {
    await GUARDS[folder]();
  } catch {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  return NextResponse.json(createUploadSignature(folder));
}
