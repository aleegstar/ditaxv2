/**
 * Money — deterministic decimal-safe value object.
 *
 * Rules:
 *  - No JS floats. All amounts are decimal strings (e.g. "1234.5600").
 *  - DB column type: numeric(18,4). Internal scale: 4.
 *  - Currency stored alongside (ISO 4217). Default CHF.
 *  - All arithmetic via decimal.js — deterministic, no rounding surprises.
 *  - `round(...)` is presentation/calculation only; storage keeps 4-digit precision.
 *  - CHF Rappen rounding (0.05) helper available for display, not for storage.
 */
import Decimal from 'decimal.js';

// Configure once: enough precision for tax math, no exponential notation.
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -9e15, toExpPos: 9e15 });

export type CurrencyCode = 'CHF' | 'EUR' | 'USD' | (string & {});

export interface Money {
  /** Decimal string at scale 4, e.g. "1234.5600". Never a JS number. */
  readonly amount: string;
  readonly currency: CurrencyCode;
}

export type RoundingMode = 'HALF_UP' | 'HALF_EVEN' | 'DOWN' | 'UP';

const STORAGE_SCALE = 4;

function toDecimal(input: string | number | Decimal | Money): Decimal {
  if (input && typeof input === 'object' && 'amount' in input) {
    return new Decimal((input as Money).amount);
  }
  return new Decimal(input as string | number | Decimal);
}

function rmToDecimal(mode: RoundingMode): Decimal.Rounding {
  switch (mode) {
    case 'HALF_UP': return Decimal.ROUND_HALF_UP;
    case 'HALF_EVEN': return Decimal.ROUND_HALF_EVEN;
    case 'DOWN': return Decimal.ROUND_DOWN;
    case 'UP': return Decimal.ROUND_UP;
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

function make(d: Decimal, currency: CurrencyCode): Money {
  return { amount: d.toFixed(STORAGE_SCALE), currency };
}

export const Money = {
  of(amount: string | number | Decimal, currency: CurrencyCode = 'CHF'): Money {
    return make(toDecimal(amount), currency);
  },

  zero(currency: CurrencyCode = 'CHF'): Money {
    return make(new Decimal(0), currency);
  },

  add(a: Money, b: Money): Money {
    assertSameCurrency(a, b);
    return make(toDecimal(a).plus(toDecimal(b)), a.currency);
  },

  sub(a: Money, b: Money): Money {
    assertSameCurrency(a, b);
    return make(toDecimal(a).minus(toDecimal(b)), a.currency);
  },

  mul(a: Money, factor: string | number | Decimal): Money {
    return make(toDecimal(a).times(new Decimal(factor as never)), a.currency);
  },

  div(a: Money, divisor: string | number | Decimal): Money {
    return make(toDecimal(a).div(new Decimal(divisor as never)), a.currency);
  },

  /** Deterministic rounding to N decimals. Default scale 2. */
  round(m: Money, mode: RoundingMode = 'HALF_UP', scale = 2): Money {
    const d = toDecimal(m).toDecimalPlaces(scale, rmToDecimal(mode));
    return { amount: d.toFixed(STORAGE_SCALE), currency: m.currency };
  },

  /** CHF Rappen rounding to nearest 0.05 — display/payment only. */
  roundCHFRappen(m: Money): Money {
    if (m.currency !== 'CHF') return Money.round(m, 'HALF_UP', 2);
    const rounded = toDecimal(m).times(20).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).div(20);
    return make(rounded, m.currency);
  },

  /** Integer minor units (e.g. cents/Rappen). */
  toMinorUnits(m: Money): bigint {
    const d = toDecimal(m).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return BigInt(d.toFixed(0));
  },

  fromMinorUnits(units: bigint | number, currency: CurrencyCode = 'CHF'): Money {
    return make(new Decimal(units.toString()).div(100), currency);
  },

  cmp(a: Money, b: Money): -1 | 0 | 1 {
    assertSameCurrency(a, b);
    const c = toDecimal(a).comparedTo(toDecimal(b));
    return c < 0 ? -1 : c > 0 ? 1 : 0;
  },

  isZero(m: Money): boolean { return toDecimal(m).isZero(); },
  isNegative(m: Money): boolean { return toDecimal(m).isNegative(); },

  /** Persist as a `{ amount, currency }` row pair. */
  toDb(m: Money | null | undefined): { amount: string | null; currency: CurrencyCode | null } {
    if (!m) return { amount: null, currency: null };
    return { amount: toDecimal(m).toFixed(STORAGE_SCALE), currency: m.currency };
  },

  /** Hydrate from DB pair. */
  fromDb(amount: string | number | null | undefined, currency: CurrencyCode | null | undefined = 'CHF'): Money | null {
    if (amount === null || amount === undefined || amount === '') return null;
    return make(new Decimal(amount as never), (currency || 'CHF') as CurrencyCode);
  },

  /** Stable string representation for hashing / canonical JSON. */
  toCanonicalString(m: Money): string {
    return `${toDecimal(m).toFixed(STORAGE_SCALE)} ${m.currency}`;
  },
};
