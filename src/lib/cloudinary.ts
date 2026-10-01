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
 *      works for one upload, into one folder, for a few minutes - not a key
 *      that could be used for anything else.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;

export type UploadFolder = "products" | "payments" | "designs" | "reviews" | "homepage";

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
 * The parameters sent with the upload must match EXACTLY what was signed -
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
 * True only for a file uploaded to OUR Cloudinary account, into the given
 * folder. Anything submitted is checked with this before it is saved - the
 * site then renders it, so an arbitrary URL must never get through.
 */
export function isOwnUpload(
  url: string,
  folder: UploadFolder,
  kind: "image" | "video" = "image",
): boolean {
  if (!CLOUD_NAME) return false;
  const prefix = `https://res.cloudinary.com/${CLOUD_NAME}/${kind}/upload/`;
  return url.startsWith(prefix) && url.includes(`/ruderegez/${folder}/`);
}

/**
 * Rewrites a Cloudinary URL to request a transformed version.
 *
 * This is the reason for choosing Cloudinary over plain file storage: the
 * original 4MB photo stays untouched, and the grid asks for an 800px WebP
 * version by changing the URL. Nothing is re-uploaded or pre-generated.
 *
 *   f_auto  - WebP or AVIF where the browser supports it
 *   q_auto  - compression chosen per image
 *   w_800   - resized
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
/**
 * A product video, re-encoded by Cloudinary for whatever the browser plays
 * best (f_auto) at a sensible quality (q_auto), capped at 1080px wide - a
 * phone video uploaded at 4K plays without the customer downloading 4K.
 */
export function cloudinaryVideoUrl(url: string): string {
  if (!url.includes("/video/upload/")) return url;
  return url.replace("/video/upload/", "/video/upload/f_auto,q_auto,w_1080,c_limit/");
}

/**
 * A still frame of the video as a JPG - its first frame (so_0) - used as the
 * poster before it plays and as the gallery thumbnail. Nothing extra is
 * uploaded: Cloudinary makes it from the video on first request.
 */
export function cloudinaryVideoPoster(url: string, opts: { width?: number } = {}): string {
  if (!url.includes("/video/upload/")) return url;
  const parts = ["so_0", "f_jpg", "q_auto"];
  if (opts.width) parts.push(`w_${opts.width}`);
  return url
    .replace("/video/upload/", `/video/upload/${parts.join(",")}/`)
    .replace(/\.[a-z0-9]+$/i, ".jpg");
}
