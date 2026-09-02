import { createHash } from "crypto";

/**
 * SIGNED DIRECT UPLOAD
 *
 * The file never passes through our server. The browser asks us for a short
 * signature, then uploads straight to Cloudinary with it.
 *
 * Two reasons this shape rather than proxying the file:
 *
 *   1. Vercel functions have a request body limit and a short timeout. A 5MB
 *      photo from a phone camera is exactly the wrong thing to route through
 *      one.
 *   2. The API secret stays on the server. The browser gets a signature that
 *      works for one upload, into one folder, for a few minutes — not a key
 *      that could be used for anything else.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;

export type UploadFolder = "products" | "payments" | "designs";

export interface UploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Cloudinary's signing rule: take every parameter you intend to send (except
 * the file itself and the api_key), sort them alphabetically, join as
 * key=value pairs with &, append the secret, and SHA-1 the result.
 *
 * The parameters sent with the upload must match EXACTLY what was signed —
 * one extra field, or a different folder, and Cloudinary rejects it. That is
 * the point: the browser cannot upload anywhere we did not authorise.
 */
export function createUploadSignature(folder: UploadFolder): UploadSignature {
  const timestamp = Math.round(Date.now() / 1000);
  const fullFolder = `ruderegez/${folder}`;

  const params: Record<string, string | number> = {
    folder: fullFolder,
    timestamp,
  };

  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const signature = createHash("sha1")
    .update(toSign + API_SECRET)
    .digest("hex");

  return {
    signature,
    timestamp,
    apiKey: API_KEY,
    cloudName: CLOUD_NAME,
    folder: fullFolder,
  };
}

/**
 * Rewrites a Cloudinary URL to request a transformed version.
 *
 * This is the reason for choosing Cloudinary over plain file storage: the
 * original 4MB photo stays untouched, and the grid asks for an 800px WebP
 * version by changing the URL. Nothing is re-uploaded or pre-generated.
 *
 *   f_auto  — WebP or AVIF where the browser supports it
 *   q_auto  — compression chosen per image
 *   w_800   — resized
 */
export function cloudinaryUrl(
  url: string,
  opts: { width?: number; height?: number } = {},
): string {
  if (!url.includes("/upload/")) return url;

  const parts = ["f_auto", "q_auto"];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`, "c_fill");

  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}