/**
 * Validation errors type
 */
export interface ValidationError {
    valid: boolean;
    message: string;
}

/**
 * Validate step 1: Pet and dates selection
 * @param selectedPetId - Selected pet ID
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns Validation result
 */
export function validateBookingDatesAndPet(
    selectedPetId: string,
    checkInDate: string,
    checkOutDate: string
): ValidationError {
    if (!selectedPetId || !checkInDate || !checkOutDate) {
        return {
            valid: false,
            message: 'Please select pet and dates',
        };
    }

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);

    if (outDate <= inDate) {
        return {
            valid: false,
            message: 'Check-out date must be after check-in date',
        };
    }

    return {
        valid: true,
        message: '',
    };
}

/**
 * Validate step 2: Room selection
 * @param selectedRoomId - Selected room ID
 * @returns Validation result
 */
export function validateRoomSelection(selectedRoomId: string): ValidationError {
    if (!selectedRoomId) {
        return {
            valid: false,
            message: 'Please select a room',
        };
    }

    return {
        valid: true,
        message: '',
    };
}

/**
 * Validate step 3: Confirmations
 * @param confirmedTerms - Terms confirmation
 * @param confirmedDates - Dates confirmation
 * @param confirmedRequirements - Requirements confirmation
 * @returns Validation result
 */
export function validateBookingConfirmation(
    confirmedTerms: boolean,
    confirmedDates: boolean,
    confirmedRequirements: boolean
): ValidationError {
    if (!confirmedTerms || !confirmedDates || !confirmedRequirements) {
        return {
            valid: false,
            message: 'Please confirm all requirements',
        };
    }

    return {
        valid: true,
        message: '',
    };
}

/**
 * Check if check-out date is valid (after check-in)
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns true if valid
 */
export function isCheckOutDateValid(checkInDate: string, checkOutDate: string): boolean {
    if (!checkInDate || !checkOutDate) return false;
    return new Date(checkOutDate) > new Date(checkInDate);
}

/**
 * Check if date is in the future or today
 * @param dateString - Date string to check
 * @returns true if date is valid
 */
export function isFutureDate(dateString: string): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}
