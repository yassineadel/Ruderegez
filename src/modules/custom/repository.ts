import { prisma } from "@/lib/db";
import type { Prisma, CustomRequest } from "@/generated/prisma/client";

export type CustomRequestDetail = Prisma.CustomRequestGetPayload<{
  include: { images: true; user: { select: { name: true; email: true } } };
}>;

export function findRequestByReference(
  reference: string,
): Promise<CustomRequestDetail | null> {
  return prisma.customRequest.findUnique({
    where: { reference },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });
}

export function findRequestsForUser(userId: string): Promise<CustomRequestDetail[]> {
  return prisma.customRequest.findMany({
    where: { userId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function requestReferenceExists(reference: string): Promise<boolean> {
  const found = await prisma.customRequest.findUnique({
    where: { reference },
    select: { id: true },
  });
  return found !== null;
}

/**
 * Creates the request and its images together.
 *
 * A request with no images is a request nobody can quote - the photos ARE the
 * brief. Either both land or neither does.
 */
export function createRequestTransaction(data: {
  request: Prisma.CustomRequestCreateInput;
  images: { url: string; sizeBytes: number; mimeType: string }[];
}): Promise<CustomRequest> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.customRequest.create({ data: data.request });

    await tx.customRequestImage.createMany({
      data: data.images.map((img, i) => ({
        requestId: created.id,
        url: img.url,
        sizeBytes: img.sizeBytes,
        mimeType: img.mimeType,
        sortOrder: i,
      })),
    });

    return created;
  });
}