export type FieldKind =
  | "money"
  | "percent"
  | "int"
  | "text"
  | "textarea"
  | "select";

export interface SettingField {
  key: string;
  label: string;
  kind: FieldKind;
  help?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  allowEmpty?: boolean;
}

export interface SettingGroup {
  title: string;
  description: string;
  fields: SettingField[];
}

export const SETTING_GROUPS: SettingGroup[] = [
  {
    title: "Pricing",
    description:
      "These drive every price in the store. A change here affects new carts immediately; existing orders keep the price they were placed at.",
    fields: [
      {
        key: "silverRatePerGramMinor",
        label: "Silver rate per gram",
        kind: "money",
        help: "EGP per gram. The single most important number in the store.",
        min: 1,
        max: 10000,
      },
      {
        key: "depositPercent",
        label: "Deposit — standard orders",
        kind: "percent",
        min: 0,
        max: 100,
      },
      {
        key: "depositPercentCustom",
        label: "Deposit — custom orders",
        kind: "percent",
        min: 0,
        max: 100,
      },
      {
        key: "deliveryFeeMinor",
        label: "Delivery fee",
        kind: "money",
        help: "EGP, flat, within the delivery city.",
        min: 0,
        max: 10000,
      },
      {
        key: "weightTolerancePercent",
        label: "Weight tolerance",
        kind: "percent",
        help: "Percent added to the quoted weight to absorb variation in handmade pieces. Raising this raises every price.",
        min: 0,
        max: 100,
      },
    ],
  },
  {
    title: "Engraving",
    description:
      "Placeholder rules until the client confirms how engraving is charged.",
    fields: [
      {
        key: "engravingFeeMode",
        label: "Charging mode",
        kind: "select",
        options: [
          { value: "FLAT", label: "Flat fee per piece" },
          { value: "PER_CHAR", label: "Per character" },
        ],
        help: "Which of the two fees below is applied.",
      },
      {
        key: "engravingFeeMinor",
        label: "Flat fee",
        kind: "money",
        help: "EGP per engraved piece. Used when mode is Flat.",
        min: 0,
        max: 1000000,
      },
      {
        key: "engravingFeePerCharMinor",
        label: "Per-character fee",
        kind: "money",
        help: "EGP per character. Used when mode is Per character.",
        min: 0,
        max: 1000000,
      },
      {
        key: "engravingMaxChars",
        label: "Maximum characters",
        kind: "int",
        help: "Longest engraving accepted.",
        min: 1,
        max: 200,
      },
    ],
  },
  {
    title: "Lead times",
    description: "Shown to customers at checkout and on custom quotes.",
    fields: [
      {
        key: "defaultLeadTimeDays",
        label: "Standard order lead time",
        kind: "int",
        help: "Days.",
        min: 0,
        max: 365,
      },
      {
        key: "customLeadTimeDays",
        label: "Custom order lead time",
        kind: "int",
        help: "Days.",
        min: 0,
        max: 365,
      },
      {
        key: "quoteSlaDaysMin",
        label: "Quote turnaround — fastest",
        kind: "int",
        help: "Days. Shown as a range on submission.",
        min: 0,
        max: 365,
      },
      {
        key: "quoteSlaDaysMax",
        label: "Quote turnaround — slowest",
        kind: "int",
        help: "Days. Must not be less than the fastest.",
        min: 0,
        max: 365,
      },
    ],
  },
  {
    title: "Payment details",
    description:
      "Shown to the customer on the payment page. Leaving one blank hides that method.",
    fields: [
      {
        key: "instapayHandle",
        label: "InstaPay handle",
        kind: "text",
        allowEmpty: true,
      },
      {
        key: "instapayAccountName",
        label: "InstaPay account name",
        kind: "text",
        allowEmpty: true,
      },
      {
        key: "vodafoneCashNumber",
        label: "Vodafone Cash number",
        kind: "text",
        allowEmpty: true,
      },
    ],
  },
  {
    title: "Store details",
    description: "Contact information and delivery area.",
    fields: [
      { key: "storeName", label: "Store name", kind: "text" },
      { key: "storePhone", label: "Phone", kind: "text", allowEmpty: true },
      { key: "storeAddress", label: "Address", kind: "text", allowEmpty: true },
      {
        key: "storeMapEmbedUrl",
        label: "Google Maps embed URL",
        kind: "text",
        allowEmpty: true,
      },
      {
        key: "deliveryCityAllowed",
        label: "Delivery city",
        kind: "text",
        help: "Only this city can be selected at checkout.",
      },
    ],
  },
  {
    title: "Policies",
    description:
      "Shown on the policy pages and summarised at checkout. Plain text — a blank line starts a new paragraph.",
    fields: [
      {
        key: "policyTerms",
        label: "Terms of sale",
        kind: "textarea",
        allowEmpty: true,
      },
      {
        key: "policyReturns",
        label: "Returns policy",
        kind: "textarea",
        allowEmpty: true,
      },
      {
        key: "policyPrivacy",
        label: "Privacy policy",
        kind: "textarea",
        allowEmpty: true,
      },
            {
        key: "checkoutNotice",
        label: "Checkout notice",
        kind: "textarea",
        help: "Shown at checkout and in the confirmation box. One point per line. Use {deposit}, {city} and {days} and the current values are filled in automatically — that way they never go stale when you change the settings.",
        allowEmpty: true,
      },
    ],
  },
];

export const FIELD_BY_KEY: Record<string, SettingField> = Object.fromEntries(
  SETTING_GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f]),
);

export const EDITABLE_KEYS: string[] = Object.keys(FIELD_BY_KEY);