/**
 * Form Validation Service
 * Handle form input validation and sanitization
 */

const FormValidator = {
    /**
     * Validate required field
     */
    isRequired: function(value) {
        return value && value.trim().length > 0;
    },

    /**
     * Validate email format
     */
    isValidEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate phone format
     */
    isValidPhone: function(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8;
    },

    /**
     * Validate number
     */
    isValidNumber: function(value) {
        return !isNaN(value) && value.trim().length > 0;
    },

    /**
     * Validate URL format
     */
    isValidUrl: function(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Sanitize input to prevent XSS
     */
    sanitize: function(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    /**
     * Validate form step data
     */
    validateFormStep: function(stepNum) {
        const form = document.getElementById('dataForm');
        if (!form) return true;

        const elements = form.querySelectorAll(`[data-step="${stepNum}"] input, [data-step="${stepNum}"] textarea, [data-step="${stepNum}"] select`);
        
        for (let el of elements) {
            if (el.hasAttribute('required') && !this.isRequired(el.value)) {
                UIService.showMessage(`Please fill in all required fields in Step ${stepNum}`, 'error');
                return false;
            }

            // Email validation
            if (el.type === 'email' && el.value && !this.isValidEmail(el.value)) {
                UIService.showMessage('Please enter a valid email address', 'error');
                return false;
            }
        }

        return true;
    }
};
