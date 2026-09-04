const DEFAULT_NOTICE = `Made to order. Work begins once your payment clears. Allow around {days} days.
The {deposit}% deposit is not refundable once production has started, because the piece is made for you specifically.
Weight varies slightly. Each piece is made by hand. The price already allows for this — if a piece comes out significantly heavier, we contact you before charging anything extra.
Delivery within {city} only at the moment.`;

/**
 * Substitutes the live settings values into the admin's text.
 *
 * The wording is entirely his; the numbers are not. Typing "50%" by hand would
 * be wrong the day the deposit changes — {deposit} never is.
 */
export function renderNotice(
  template: string,
  values: { deposit: number; city: string; days: number },
): string[] {
  return (template.trim() || DEFAULT_NOTICE)
    .replace(/\{deposit\}/g, String(values.deposit))
    .replace(/\{city\}/g, values.city)
    .replace(/\{days\}/g, String(values.days))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function TermsNotice({
  depositPercent,
  city,
  leadTimeDays,
  notice,
}: {
  depositPercent: number;
  city: string;
  leadTimeDays: number;
  notice?: string;
}) {
  const lines = renderNotice(notice ?? "", {
    deposit: depositPercent,
    city,
    days: leadTimeDays,
  });

  if (lines.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-line">
      <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-3">
        BEFORE YOU ORDER
      </p>
      <ul className="space-y-2 text-xs text-ink-soft leading-relaxed">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}