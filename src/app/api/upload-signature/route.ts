import { NextResponse } from "next/server";
import { requireUser, requireAdmin } from "@/lib/auth-guards";
import { createUploadSignature, type UploadFolder } from "@/lib/cloudinary";

/** Customers upload payment proof. Everything else is admin-only. */
const CUSTOMER_FOLDERS: UploadFolder[] = ["payments"];
const ADMIN_FOLDERS: UploadFolder[] = ["products", "designs"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const folder = body.folder as UploadFolder;

  try {
    if (CUSTOMER_FOLDERS.includes(folder)) {
      await requireUser();
    } else if (ADMIN_FOLDERS.includes(folder)) {
      await requireAdmin();
    } else {
      return NextResponse.json({ error: "Unknown folder" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  return NextResponse.json(createUploadSignature(folder));
}