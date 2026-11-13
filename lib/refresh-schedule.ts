// Shared catalogue checks. Keep the linked owner automation on these IST times.
export const SHARED_REFRESH_TIMEZONE='Asia/Kolkata';
export const SHARED_REFRESH_HOURS=[10,18] as const;
export const SHARED_REFRESH_TIMES=SHARED_REFRESH_HOURS.map(hour=>String(hour).padStart(2,'0')+':00');
