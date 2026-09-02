import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createUploadSignature, type UploadFolder } from "@/lib/cloudinary";

const ALLOWED: UploadFolder[] = ["products", "payments", "designs"];

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const folder = body.folder as UploadFolder;

  if (!ALLOWED.includes(folder)) {
    return NextResponse.json({ error: "Unknown folder" }, { status: 400 });
  }

  return NextResponse.json(createUploadSignature(folder));
}