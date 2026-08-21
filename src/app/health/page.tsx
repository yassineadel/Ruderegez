import { prisma } from "@/lib/db";

export default async function HealthPage() {
  const result = await prisma.$queryRaw`SELECT 1 as ok`;
  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}