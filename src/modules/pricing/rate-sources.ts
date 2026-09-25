/**
 * The two outside numbers the silver rate is built from.
 *
 * Both fetchers return plain numbers or throw a short code. They never touch
 * the database - that keeps them easy to swap if a provider changes.
 */

const TIMEOUT_MS = 8000;
const GRAMS_PER_TROY_OUNCE = 31.1035;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return res.json();
}

/** International spot price of pure silver, US dollars per troy ounce. */
export async function fetchSilverUsdPerOz(): Promise<number> {
  const data = (await getJson("https://api.gold-api.com/price/XAG")) as {
    price?: unknown;
  };
  const price = Number(data.price);
  // Silver has traded between roughly $4 and $120 in living memory. Anything
  // outside a wide band around that is a broken response, not a market move.
  if (!Number.isFinite(price) || price < 1 || price > 1000) {
    throw new Error("SILVER_PRICE_INVALID");
  }
  return price;
}

/** Official USD -> EGP rate. The provider updates it once a day. */
export async function fetchEgpPerUsd(): Promise<number> {
  const data = (await getJson("https://open.er-api.com/v6/latest/USD")) as {
    result?: string;
    rates?: Record<string, unknown>;
  };
  const egp = Number(data.rates?.EGP);
  if (data.result !== "success" || !Number.isFinite(egp) || egp < 5 || egp > 1000) {
    throw new Error("FX_RATE_INVALID");
  }
  return egp;
}

/**
 * EGP per gram of pure silver, in piastres.
 *
 *   ($ per oz  x  EGP per $)  /  31.1035 g per oz  =  EGP per gram
 *
 * Pure (999) silver - no x0.925. Purity is already inside each product's
 * factor, so applying it here would count it twice.
 */
export function toRateMinor(usdPerOz: number, egpPerUsd: number): number {
  return Math.round(((usdPerOz * egpPerUsd) / GRAMS_PER_TROY_OUNCE) * 100);
}