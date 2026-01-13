import {
    validateStep1,
    validateStep2,
    validateStep3,
    isCheckOutDateValid,
    isFutureDate,
} from '../boardingValidation';

describe('boardingValidation', () => {
    describe('validateStep1', () => {
        it('should return invalid if selectedPetId is empty', () => {
            const result = validateStep1('', '2024-01-10', '2024-01-15');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Please select pet and dates');
        });

        it('should return invalid if checkInDate is empty', () => {
            const result = validateStep1('pet1', '', '2024-01-15');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Please select pet and dates');
        });

        it('should return invalid if checkOutDate is empty', () => {
            const result = validateStep1('pet1', '2024-01-10', '');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Please select pet and dates');
        });

        it('should return invalid if checkout is before checkin', () => {
            const result = validateStep1('pet1', '2024-01-20', '2024-01-10');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Check-out date must be after check-in date');
        });

        it('should return invalid if checkout equals checkin', () => {
            const result = validateStep1('pet1', '2024-01-10', '2024-01-10');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Check-out date must be after check-in date');
        });

        it('should return valid when all fields are correct', () => {
            const result = validateStep1('pet1', '2024-01-10', '2024-01-15');
            expect(result.valid).toBe(true);
            expect(result.message).toBe('');
        });

        it('should handle dates across months', () => {
            const result = validateStep1('pet1', '2024-01-28', '2024-02-05');
            expect(result.valid).toBe(true);
        });
    });

    describe('validateStep2', () => {
        it('should return invalid if selectedRoomId is empty', () => {
            const result = validateStep2('');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Please select a room');
        });

        it('should return valid if room is selected', () => {
            const result = validateStep2('room1');
            expect(result.valid).toBe(true);
            expect(result.message).toBe('');
        });
    });

    describe('validateStep3', () => {
        it('should return invalid if any confirmation is false', () => {
            const result = validateStep3(true, false, true);
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Please confirm all requirements');
        });

        it('should return invalid if all confirmations are false', () => {
            const result = validateStep3(false, false, false);
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Please confirm all requirements');
        });

        it('should return valid if all confirmations are true', () => {
            const result = validateStep3(true, true, true);
            expect(result.valid).toBe(true);
            expect(result.message).toBe('');
        });
    });

    describe('isCheckOutDateValid', () => {
        it('should return false if checkIn is empty', () => {
            expect(isCheckOutDateValid('', '2024-01-15')).toBe(false);
        });

        it('should return false if checkOut is empty', () => {
            expect(isCheckOutDateValid('2024-01-10', '')).toBe(false);
        });

        it('should return false if checkout is before checkin', () => {
            expect(isCheckOutDateValid('2024-01-20', '2024-01-10')).toBe(false);
        });

        it('should return false if dates are equal', () => {
            expect(isCheckOutDateValid('2024-01-10', '2024-01-10')).toBe(false);
        });

        it('should return true if checkout is after checkin', () => {
            expect(isCheckOutDateValid('2024-01-10', '2024-01-15')).toBe(true);
        });
    });

    describe('isFutureDate', () => {
        it('should return false if dateString is empty', () => {
            expect(isFutureDate('')).toBe(false);
        });

        it('should return false if date is in the past', () => {
            expect(isFutureDate('2020-01-01')).toBe(false);
        });

        it('should return true if date is today', () => {
            const today = new Date().toISOString().split('T')[0];
            expect(isFutureDate(today)).toBe(true);
        });

        it('should return true if date is in the future', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            const dateString = futureDate.toISOString().split('T')[0];
            expect(isFutureDate(dateString)).toBe(true);
        });
    });
});
