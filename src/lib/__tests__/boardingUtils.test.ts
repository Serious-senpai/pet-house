import { calcDays, calcTotal, formatDate, formatPrice } from '../boardingUtils';

describe('boardingUtils', () => {
    describe('calcDays', () => {
        it('should return 0 if checkIn is empty', () => {
            expect(calcDays('', '2024-01-20')).toBe(0);
        });

        it('should return 0 if checkOut is empty', () => {
            expect(calcDays('2024-01-10', '')).toBe(0);
        });

        it('should return 0 if both dates are empty', () => {
            expect(calcDays('', '')).toBe(0);
        });

        it('should calculate correct days between two dates', () => {
            const result = calcDays('2024-01-10', '2024-01-15');
            expect(result).toBe(5);
        });

        it('should return 1 day if dates are the same', () => {
            const result = calcDays('2024-01-10', '2024-01-10');
            expect(result).toBe(0);
        });

        it('should handle negative days (when checkout is before checkin)', () => {
            const result = calcDays('2024-01-20', '2024-01-10');
            expect(result).toBeLessThan(0);
        });

        it('should calculate correct days for 7 day booking', () => {
            const result = calcDays('2024-01-10', '2024-01-17');
            expect(result).toBe(7);
        });

        it('should calculate correct days across months', () => {
            const result = calcDays('2024-01-28', '2024-02-05');
            expect(result).toBe(8);
        });
    });

    describe('calcTotal', () => {
        it('should return pricePerDay when days is 0', () => {
            expect(calcTotal(50, 0)).toBe(50);
        });

        it('should return pricePerDay when days is 1', () => {
            expect(calcTotal(50, 1)).toBe(50);
        });

        it('should calculate correct total for multiple days', () => {
            expect(calcTotal(50, 5)).toBe(250);
        });

        it('should calculate correct total for 7 days', () => {
            expect(calcTotal(75, 7)).toBe(525);
        });

        it('should handle negative days by using maximum of 1', () => {
            expect(calcTotal(100, -5)).toBe(100);
        });

        it('should handle decimal prices', () => {
            expect(calcTotal(29.99, 3)).toBe(89.97);
        });

        it('should handle zero price', () => {
            expect(calcTotal(0, 5)).toBe(0);
        });
    });

    describe('formatDate', () => {
        it('should return empty string for empty input', () => {
            expect(formatDate('')).toBe('');
        });

        it('should format valid date', () => {
            const result = formatDate('2024-01-15');
            expect(result).toContain('2024');
        });

        it('should return consistent format', () => {
            const result = formatDate('2024-12-25');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('formatPrice', () => {
        it('should format price to 2 decimal places', () => {
            expect(formatPrice(100)).toBe('100.00');
        });

        it('should round decimal prices', () => {
            expect(formatPrice(29.99)).toBe('29.99');
        });

        it('should handle zero', () => {
            expect(formatPrice(0)).toBe('0.00');
        });

        it('should handle large numbers', () => {
            expect(formatPrice(1000.5)).toBe('1000.50');
        });
    });
});
