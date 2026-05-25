/**
 * UI Service
 * Centralized UI messaging and DOM manipulation
 */

const UIService = {
    /**
     * Show message in the UI
     */
    showMessage: function(text, type = 'error') {
        const errorMsg = document.getElementById('errorMessage');
        const successMsg = document.getElementById('successMessage');
        const infoMsg = document.getElementById('infoMessage');

        // Hide all messages
        document.querySelectorAll('.error-message, .success-message, .info-message').forEach(el => {
            el.classList.remove('show');
        });

        let msgEl;
        if (type === 'error') {
            msgEl = errorMsg;
        } else if (type === 'success') {
            msgEl = successMsg;
        } else {
            msgEl = infoMsg;
        }

        if (msgEl) {
            msgEl.textContent = text;
            msgEl.classList.add('show');

            // Auto-hide non-error messages
            if (type !== 'error') {
                setTimeout(() => {
                    msgEl.classList.remove('show');
                }, 4000);
            }
        }
    },

    /**
     * Update status indicator
     */
    updateStatusIndicator: function(text, color = '#51a376') {
        const status = document.getElementById('firebaseStatus');
        if (status) {
            status.textContent = text;
            status.style.color = color;
        }
    },

    /**
     * Disable/Enable button
     */
    setButtonDisabled: function(buttonId, disabled = true) {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.disabled = disabled;
        }
    },

    /**
     * Update button text
     */
    setButtonText: function(buttonId, text) {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.textContent = text;
        }
    },

    /**
     * Show/hide element
     */
    toggleElement: function(elementId, show = true) {
        const el = document.getElementById(elementId);
        if (el) {
            el.style.display = show ? 'block' : 'none';
        }
    }
};
