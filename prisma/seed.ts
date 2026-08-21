// =============================================================================
// RUDEREGEZ — DATABASE SEED
// =============================================================================
//
// Run with:  npx prisma db seed
//        or: npx tsx prisma/seed.ts
//
// This script is IDEMPOTENT — every write is an `upsert`, so running it
// twice does not create duplicates. You will re-run it often (after a
// `db push --force-reset`, after changing a default), so this matters.
//
// WHAT GOES IN HERE:
//   - Settings, including the three values the client has confirmed
//   - Your admin account (Argon2id hashed)
//   - Product types, so the catalog has categories
//   - Six sample products, so there is something to look at while building
//   - Shapes and fonts, so the 2D builder has a palette on Day 10
//
// WHAT DOES NOT GO IN HERE:
//   Real client data. Everything below is placeholder content that gets
//   replaced on Day 12 (content freeze).
// =============================================================================

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// -----------------------------------------------------------------------------
// SETTINGS
// -----------------------------------------------------------------------------
// Every value the client has NOT yet supplied gets a sensible placeholder here.
// This is the single most important trick for the deadline: nothing in the
// build is ever blocked waiting for an answer, and the client can change any
// of these from the admin panel after handover.
//
// CONFIRMED BY CLIENT (19 Aug):
//   silver rate     113.68 EGP/g
//   deposit         50%, same for standard and custom
//   delivery        80 EGP within Cairo
// -----------------------------------------------------------------------------

const SETTINGS: Record<string, string> = {
  // --- CONFIRMED ---------------------------------------------------------
  silverRatePerGramMinor: "11368", // 113.68 EGP
  depositPercent: "50",
  depositPercentCustom: "50", // client confirmed: same as standard
  deliveryFeeMinor: "8000", // 80.00 EGP

  // --- PLACEHOLDERS — client still to confirm ----------------------------
  // BRD 6.2: the engraving fee rule has not been supplied. Flat fee assumed
  // so the builder can display a price on Day 10. Swap the rule when it
  // arrives; only src/modules/pricing/calc.ts changes.
  engravingFeeMode: "FLAT", // FLAT | PER_CHAR
  engravingFeeMinor: "15000", // 150.00 EGP per piece
  engravingFeePerCharMinor: "2000", // 20.00 EGP per character
  engravingMaxChars: "20",

  // BRD 7.2 — the tolerance that absorbs weight variation in both directions
  weightTolerancePercent: "20",

  // BRD 6.3 — quote turnaround shown to the customer on submission (FR-75)
  quoteSlaDaysMin: "2",
  quoteSlaDaysMax: "5",

  // BRD 6.3 — upload limits, enforced in the service layer
  uploadMaxImages: "3",
  uploadMaxBytes: "5242880", // 5 MB

  // Production lead times, per BRD 1.4 (no stock — lead time replaces it)
  defaultLeadTimeDays: "7",
  customLeadTimeDays: "14",

  // --- CLIENT TO SUPPLY --------------------------------------------------
  instapayHandle: "",
  instapayAccountName: "",
  vodafoneCashNumber: "", // BRD 7.4 — raised, not yet decided
  storeAddress: "",
  storeMapEmbedUrl: "",
  storePhone: "",

  // Policy text (BRD 12.3). LAUNCH BLOCKER — legal documents, client's
  // responsibility. Kept as settings so the client can edit without a deploy.
  policyReturns: "",
  policyTerms: "",
  policyPrivacy: "",

  // --- OPERATIONAL -------------------------------------------------------
  deliveryCityAllowed: "Cairo", // FR-50, Cairo only at launch
  storeName: "Ruderegez",
  currencyCode: "EGP",
};

// -----------------------------------------------------------------------------
// SAMPLE PRODUCTS
// -----------------------------------------------------------------------------
// Weights and factors are invented. They exist so the pricing engine has
// something to chew on and the catalog is not empty while you build.
//
// Worked example, using the confirmed rate:
//   8.5 g x 113.68 EGP x 2.4  =  2,319.07 EGP
//   8500  x 11368    x 24000 / (1000 x 10000)  =  231907 minor
// -----------------------------------------------------------------------------

const PRODUCTS = [
  {
    slug: "signet-ring-classic",
    name: "Classic Signet Ring",
    description:
      "A solid sterling silver signet ring with a flat face, ready for engraving. Hand-finished in our Cairo workshop.",
    typeSlug: "ring",
    audience: "MEN" as const,
    weightMg: 8500,
    factorBp: 24000,
    leadTimeDays: 7,
    isFeatured: true,
    sizes: ["17 mm", "18 mm", "19 mm", "20 mm"],
  },
  {
    slug: "twisted-band-ring",
    name: "Twisted Band Ring",
    description:
      "A slim twisted band that catches the light from every angle. Comfortable for everyday wear.",
    typeSlug: "ring",
    audience: "UNISEX" as const,
    weightMg: 4200,
    factorBp: 26000,
    leadTimeDays: 5,
    isBestSeller: true,
    sizes: ["15 mm", "16 mm", "17 mm", "18 mm"],
  },
  {
    slug: "chain-bracelet-fine",
    name: "Fine Chain Bracelet",
    description:
      "A delicate curb chain bracelet with a secure lobster clasp. Sits close to the wrist.",
    typeSlug: "bracelet",
    audience: "WOMEN" as const,
    weightMg: 6800,
    factorBp: 23000,
    leadTimeDays: 7,
    isFeatured: true,
    sizes: ["17 cm", "18 cm", "19 cm"],
  },
  {
    slug: "pendant-necklace-drop",
    name: "Drop Pendant Necklace",
    description:
      "A polished teardrop pendant on a fine box chain. Available with engraving on the reverse.",
    typeSlug: "necklace",
    audience: "WOMEN" as const,
    weightMg: 5400,
    factorBp: 27000,
    leadTimeDays: 10,
    isTrending: true,
    sizes: ["40 cm", "45 cm", "50 cm"],
  },
  {
    slug: "keychain-tag-square",
    name: "Square Tag Keychain",
    description:
      "A weighty square tag on a split ring. The flat face takes engraving well.",
    typeSlug: "keychain",
    audience: "UNISEX" as const,
    weightMg: 12000,
    factorBp: 20000,
    leadTimeDays: 5,
    isBestSeller: true,
    sizes: [],
  },
  {
    // FR-84 — kits bypass the silver formula entirely and use a flat price.
    slug: "silver-care-kit",
    name: "Silver Care Kit",
    description:
      "Polishing cloth, anti-tarnish strips, and a soft brush. Everything needed to keep a piece bright.",
    typeSlug: "care-kit",
    audience: "NONE" as const,
    weightMg: 0,
    factorBp: 10000,
    isFlatPrice: true,
    flatPriceMinor: 45000, // 450.00 EGP
    leadTimeDays: 2,
    sizes: [],
  },
];

// -----------------------------------------------------------------------------
// SHAPES FOR THE 2D BUILDER (BRD 6.2)
// -----------------------------------------------------------------------------
// Placeholder artwork. The client owes real SVG files with a weight per size.
//
// BRD 12.2 — the client supplied weights as RANGES. A range cannot produce a
// price. weightMg holds the MIDPOINT, which is what actually gets charged;
// min and max are stored for the admin's reference only. The 20% tolerance
// in BRD 7.2 absorbs movement in both directions.
// -----------------------------------------------------------------------------

const SHAPES = [
  {
    slug: "ring-band",
    name: "Ring band",
    sizes: [
      { label: "2 cm diameter", min: 1000, max: 3000 },
      { label: "3 cm diameter", min: 2000, max: 4000 },
    ],
  },
  {
    slug: "flat-disc",
    name: "Flat disc",
    sizes: [
      { label: "10 mm", min: 800, max: 1400 },
      { label: "15 mm", min: 1500, max: 2500 },
    ],
  },
  {
    slug: "heart-charm",
    name: "Heart charm",
    sizes: [
      { label: "8 mm", min: 600, max: 1000 },
      { label: "12 mm", min: 1200, max: 2000 },
    ],
  },
];

const midpoint = (min: number, max: number) => Math.round((min + max) / 2);

// -----------------------------------------------------------------------------
// FONTS (BRD 6.2)
// -----------------------------------------------------------------------------
// Latin AND Arabic are both supported for engraving. This is unrelated to the
// site being English-only — engraving a name in Arabic is a rendering task,
// not an interface translation.
//
// Real font files must be self-hosted and LICENCE-CHECKED before launch.
// -----------------------------------------------------------------------------

const FONTS = [
  { name: "Cormorant", latin: true, arabic: false },
  { name: "Inter", latin: true, arabic: false },
  { name: "Amiri", latin: true, arabic: true },
  { name: "Cairo", latin: true, arabic: true },
];

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("Seeding Ruderegez\n");

  // --- SETTINGS ------------------------------------------------------------
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {}, // never overwrite a value the admin has changed
      create: { key, value },
    });
  }
  console.log(`  settings        ${Object.keys(SETTINGS).length} keys`);

  // --- ADMIN USER ----------------------------------------------------------
  // Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running.
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@ruderegez.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Store Admin",
      role: "ADMIN",
      emailVerified: new Date(),
      passwordHash: await hashPassword(adminPassword),
    },
  });
  console.log(`  admin           ${admin.email}`);

  // --- PRODUCT TYPES -------------------------------------------------------
  // BRD 5.3 leaves the full list "to confirm", which is exactly why this is
  // a table rather than an enum — the client can add more without a migration.
  const types = [
    { slug: "ring", name: "Ring" },
    { slug: "bracelet", name: "Bracelet" },
    { slug: "necklace", name: "Necklace" },
    { slug: "keychain", name: "Keychain" },
    { slug: "care-kit", name: "Care kit" },
    { slug: "organizer", name: "Organizer" },
  ];

  const typeIdBySlug = new Map<string, string>();
  for (const [i, t] of types.entries()) {
    const row = await prisma.productType.upsert({
      where: { slug: t.slug },
      update: { name: t.name, sortOrder: i },
      create: { ...t, sortOrder: i },
    });
    typeIdBySlug.set(t.slug, row.id);
  }
  console.log(`  product types   ${types.length}`);

  // --- PRODUCTS ------------------------------------------------------------
  for (const p of PRODUCTS) {
    const typeId = typeIdBySlug.get(p.typeSlug)!;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        typeId,
        audience: p.audience,
        weightMg: p.weightMg,
        factorBp: p.factorBp,
        isFlatPrice: p.isFlatPrice ?? false,
        flatPriceMinor: p.flatPriceMinor ?? null,
        leadTimeDays: p.leadTimeDays,
        isFeatured: p.isFeatured ?? false,
        isTrending: p.isTrending ?? false,
        isBestSeller: p.isBestSeller ?? false,
      },
    });

    // One placeholder image each. Real photos arrive on Day 12.
    const existingImages = await prisma.productImage.count({
      where: { productId: product.id },
    });
    if (existingImages === 0) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: `https://placehold.co/900x900/e8e4dc/3d3d3a?text=${encodeURIComponent(p.name)}`,
          alt: p.name,
          isPrimary: true,
          sortOrder: 0,
        },
      });
    }

    for (const [i, label] of p.sizes.entries()) {
      await prisma.productSize.upsert({
        where: { productId_label: { productId: product.id, label } },
        update: { sortOrder: i },
        create: { productId: product.id, label, sortOrder: i },
      });
    }
  }
  console.log(`  products        ${PRODUCTS.length}`);

  // --- SHAPES --------------------------------------------------------------
  for (const [i, s] of SHAPES.entries()) {
    const shape = await prisma.shape.upsert({
      where: { slug: s.slug },
      update: { name: s.name, sortOrder: i },
      create: {
        slug: s.slug,
        name: s.name,
        sortOrder: i,
        assetUrl: `https://placehold.co/200x200/e8e4dc/3d3d3a?text=${encodeURIComponent(s.name)}`,
      },
    });

    for (const [j, size] of s.sizes.entries()) {
      await prisma.shapeSize.upsert({
        where: { shapeId_label: { shapeId: shape.id, label: size.label } },
        update: {},
        create: {
          shapeId: shape.id,
          label: size.label,
          weightMg: midpoint(size.min, size.max), // BRD 12.2
          weightMinMg: size.min,
          weightMaxMg: size.max,
          sortOrder: j,
        },
      });
    }
  }
  console.log(`  shapes          ${SHAPES.length}`);

  // --- FONTS ---------------------------------------------------------------
  for (const [i, f] of FONTS.entries()) {
    await prisma.font.upsert({
      where: { name: f.name },
      update: { sortOrder: i },
      create: {
        name: f.name,
        fileUrl: `/fonts/${f.name.toLowerCase()}.woff2`,
        supportsLatin: f.latin,
        supportsArabic: f.arabic,
        sortOrder: i,
      },
    });
  }
  console.log(`  fonts           ${FONTS.length}`);

  console.log("\nDone.");
  console.log(`Sign in as ${adminEmail}`);
  console.log("Silver rate seeded at 113.68 EGP/g, deposit 50%, delivery 80 EGP.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });