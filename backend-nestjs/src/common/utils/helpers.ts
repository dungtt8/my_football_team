/**
 * Coerce a value (number | string | bigint | null | undefined) to BigInt,
 * for passing IDs into Prisma queries whose fields are BigInt. Route params
 * arrive as strings and JWT ids as numbers, so we normalize here.
 */
export function bi(v: any): bigint | null {
  if (v === null || v === undefined || v === '') return null;
  return BigInt(v);
}

/** Coerce a Prisma.Decimal / string / number to a JS number for arithmetic. */
export function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : parseFloat(v.toString());
}

/** Current month in YYYY-MM (local server time — matches the Express code). */
export function currentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
