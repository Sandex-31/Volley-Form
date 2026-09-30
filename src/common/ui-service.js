/**
 * UI Service
 * Centralized UI messaging and DOM manipulation
 */

const UIService = {
    /**
     * Show message in the UI
     */
    showMessage: function(text, type = 'error') {
        // Floating toast stack, created on demand so every page (and every modal) shows it
        let region = document.getElementById('toastRegion');
        if (!region) {
            region = document.createElement('div');
            region.id = 'toastRegion';
            region.className = 'toast-region';
            region.setAttribute('role', 'status');
            region.setAttribute('aria-live', 'polite');
            document.body.appendChild(region);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type === 'error' || type === 'success' ? type : 'info'}`;
        // The toast colour already says success/error, so drop legacy leading symbols
        toast.textContent = String(text).replace(/^[\s✓✗✔✅❌⚠️🔥📊️]+/u, '');
        toast.onclick = () => toast.remove();
        region.appendChild(toast);
        while (region.children.length > 3) region.firstChild.remove();

        setTimeout(() => toast.remove(), type === 'error' ? 7000 : 4000);
    },

    /**
     * Update status indicator
     */
    updateStatusIndicator: function(text, color = 'var(--success)') {
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
