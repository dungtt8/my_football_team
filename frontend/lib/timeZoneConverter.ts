/**
 * Timezone conversion utilities for UTC ↔ GMT+7 (Vietnam Time)
 * GMT+7 = UTC + 7 hours
 */

/**
 * Convert UTC time to GMT+7 (Vietnam Time)
 * @param {string | undefined} timeUtc - Time in UTC format "HH:mm" (e.g., "13:00")
 * @returns {string | undefined} Time in GMT+7 format "HH:mm" (e.g., "20:00")
 */
export function utcToGmt7(timeUtc: string | undefined): string | undefined {
    if (!timeUtc || typeof timeUtc !== 'string') return timeUtc;

    const [hours, minutes] = timeUtc.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeUtc;

    // Add 7 hours, handle day overflow
    let newHours = (hours + 7) % 24;

    return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Convert GMT+7 (Vietnam Time) to UTC
 * @param {string | undefined} timeGmt7 - Time in GMT+7 format "HH:mm" (e.g., "20:00")
 * @returns {string | undefined} Time in UTC format "HH:mm" (e.g., "13:00")
 */
export function gmt7ToUtc(timeGmt7: string | undefined): string | undefined {
    if (!timeGmt7 || typeof timeGmt7 !== 'string') return timeGmt7;

    const [hours, minutes] = timeGmt7.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeGmt7;

    // Subtract 7 hours, handle day underflow
    let newHours = hours - 7;
    if (newHours < 0) {
        newHours += 24;
    }

    return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
