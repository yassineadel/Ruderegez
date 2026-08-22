import type {Minor} from "@/lib/money"

/*
the main formula that would be used in all project

Total Price = price-silver-per-gram * total weight(grams) * Factor of profduct
*/

export function calculateitemprice (weight : number , factor: number , rate:Minor , TolerancePercent: number ):Minor{
     
    const ChargedWeightMg = Math.round((weight *(100 + TolerancePercent))/100);

    return Math.round((ChargedWeightMg*factor*rate)/10000000)as Minor;

}