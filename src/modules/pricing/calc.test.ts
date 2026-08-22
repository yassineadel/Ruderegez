import { describe, it, expect } from "vitest";

import { sumMinor } from "@/lib/money";
import type { Minor } from "@/lib/money";
import { calculateitemprice } from "./calc";


describe("sumMinor", () => {
 /*
    it("returns 0 for an empty list", () => {
    expect(sumMinor([])).toBe(0);
  });

  it("adds three amounts", () => {
    expect(sumMinor([100, 250, 50] as Minor[])).toBe(400);
  });
*/

  it("calculate the price",()=>{
     expect(calculateitemprice(20000,25000,11368,20)).toBe(682080);
  })
});