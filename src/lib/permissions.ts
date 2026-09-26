import type { AdminPermission } from "@/generated/prisma/client";

/**
 * Every section an owner can grant, in the order the Staff page lists them.
 * Plain data with no server imports, so client components can use it too.
 */
export const PERMISSIONS: {
  key: AdminPermission;
  label: string;
  description: string;
}[] = [
  { key: "ORDERS", label: "Orders", description: "View orders and change their status" },
  { key: "PAYMENTS", label: "Payments", description: "Confirm or reject payment receipts" },
  { key: "PRODUCTS", label: "Products", description: "Add, edit and hide products" },
  { key: "CATEGORIES", label: "Categories", description: "Categories and their sizes" },
  { key: "CUSTOM_REQUESTS", label: "Custom requests", description: "Quote or reject requests" },
  { key: "REVIEWS", label: "Reviews", description: "Hide or restore reviews" },
  { key: "POLICIES", label: "Policies", description: "Edit the policy pages" },
  { key: "SETTINGS", label: "Settings", description: "Every field on the settings page" },
  { key: "SILVER_RATE", label: "Silver rate", description: "Update now, approve held rates" },
];

export const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key);

export function isPermission(value: string): value is AdminPermission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}