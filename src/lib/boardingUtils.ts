/**
 * Calculate number of days between check-in and check-out dates
 * @param checkIn - Check-in date string (ISO format)
 * @param checkOut - Check-out date string (ISO format)
 * @returns Number of days (minimum 0)
 */
export function calcDays(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    return Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate total price for boarding
 * @param pricePerDay - Price per day
 * @param days - Number of days (minimum 1)
 * @returns Total price
 */
export function calcTotal(pricePerDay: number, days: number): number {
    return pricePerDay * Math.max(1, days);
}

/**
 * Format date to locale string for display
 * @param dateString - Date string (ISO format)
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
}

/**
 * Format price to fixed 2 decimal places
 * @param price - Price value
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
    return price.toFixed(2);
}
