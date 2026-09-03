/**
 * Every date in their REST responses is epoch SECONDS. Webhooks use ISO-8601 and
 * request bodies accept ISO-8601 - three formats in one product - so the
 * conversion is pinned here at the client boundary rather than at each call site.
 * @doc https://docs.awardspring.com/conventions/pagination
 */

export const fromEpoch = (s: number | null): Date | null =>
  s === null ? null : new Date(s * 1000);

export const money = (n: number | null | undefined): string =>
  n === null || n === undefined
    ? '--'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export const moneyShort = (n: number | null | undefined): string =>
  n === null || n === undefined
    ? '--'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const longDate = (s: number | null): string => {
  const d = fromEpoch(s);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '--';
};

/** Includes the year. Gift history spans award cycles, so a bare month is ambiguous. */
export const monthLabel = (s: number): string =>
  new Date(s * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const initials = (first: string | null, last: string | null, org: string | null): string => {
  if (org) return org.slice(0, 2).toUpperCase();
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
};

export const displayName = (d: { first_name: string | null; last_name: string | null; organization?: string | null; organization_name?: string | null }): string =>
  d.organization ?? d.organization_name ?? [d.first_name, d.last_name].filter(Boolean).join(' ') ?? 'Unnamed';
