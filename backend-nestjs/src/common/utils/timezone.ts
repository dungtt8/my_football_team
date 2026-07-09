/**
 * Timezone conversion utilities for UTC <-> GMT+7 (Vietnam Time)
 * GMT+7 = UTC + 7 hours
 */

/** Convert UTC "HH:mm" to GMT+7 "HH:mm". */
export function utcToGmt7(timeUtc: string): string {
  if (!timeUtc || typeof timeUtc !== 'string') return timeUtc;

  const [hours, minutes] = timeUtc.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeUtc;

  const newHours = (hours + 7) % 24;
  return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Convert GMT+7 "HH:mm" to UTC "HH:mm". */
export function gmt7ToUtc(timeGmt7: string): string {
  if (!timeGmt7 || typeof timeGmt7 !== 'string') return timeGmt7;

  const [hours, minutes] = timeGmt7.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeGmt7;

  let newHours = hours - 7;
  if (newHours < 0) newHours += 24;

  return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
