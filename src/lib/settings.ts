import {cache} from "react";
import { prisma } from "@/lib/db";
import type { Minor } from "@/lib/money";

const getAll = cache(async (): Promise<Record<string, string>> => {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
});


export async function getSetting(key:string , fallback = ""): Promise<string>{
   const all= await getAll();
    return (all[key] ?? fallback);
}

export async function getAllSettings(): Promise<Record<string, string>> {
  return getAll();
}


function int(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export interface PricingSettings {
  silverRatePerGram: Minor;
  depositPercent: number;
  depositPercentCustom: number;
  deliveryFee: Minor;
  weightTolerancePercent: number;
  engravingFeeMode: "FLAT" | "PER_CHAR";
  engravingFee: Minor;
  engravingFeePerChar: Minor;
  engravingMaxChars: number;
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const s = await getAll();
  return {
    silverRatePerGram: int(s.silverRatePerGramMinor, 11368) as Minor,
    depositPercent: int(s.depositPercent, 50),
    depositPercentCustom: int(s.depositPercentCustom, 50),
    deliveryFee: int(s.deliveryFeeMinor, 8000) as Minor,
    weightTolerancePercent: int(s.weightTolerancePercent, 20),
    engravingFeeMode: s.engravingFeeMode === "PER_CHAR" ? "PER_CHAR" : "FLAT",
    engravingFee: int(s.engravingFeeMinor, 15000) as Minor,
    engravingFeePerChar: int(s.engravingFeePerCharMinor, 2000) as Minor,
    engravingMaxChars: int(s.engravingMaxChars, 20),
  };
}