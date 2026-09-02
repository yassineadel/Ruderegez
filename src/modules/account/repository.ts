import { prisma } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

export function updateProfile(
  userId: string,
  data: {
    name: string;
    phone: string | null;
    addressLine: string | null;
    addressNotes: string | null;
  },
): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data });
}

export function updatePassword(
  userId: string,
  passwordHash: string,
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}