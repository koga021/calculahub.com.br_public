/**
 * Core Logic for CalculaHub
 * Handles formatting, input masking, and common utilities.
 */

const App = {
    // Format currency (BRL)
    formatCurrency: (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    // Parse currency string to float 'R$ 1.000,00' -> 1000.00
    parseCurrency: (str) => {
        if (!str) return 0;
        if (typeof str === 'number') return str;
        return parseFloat(str.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    },

    // Format number with decimals
    formatNumber: (value, decimals = 2) => {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    },

    // Parse generic float '1.000,00' -> 1000.00
    parseFloat: (str) => {
        if (!str) return 0;
        if (typeof str === 'number') return str;
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    },

    // Debounce function for performance
    debounce: (func, wait) => {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    },

    // Initialize Tooltips/Popovers (Bootstrap) & Masks
    initUI: () => {
        // Init logic for Bootstrap components if needed
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-coreui-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new coreui.Tooltip(tooltipTriggerEl);
        });

        // Init Currency Masks
        const moneyInputs = document.querySelectorAll('.money-mask');
        moneyInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = App.formatInputCurrency(e.target.value);
            });
        });
    },

    // Format currency input dynamically (0,00 behavior)
    formatInputCurrency: (value) => {
        // Remove everything that is not a digit
        let v = value.replace(/\D/g, '');

        // Handle empty case
        if (!v) return '';

        // Convert to float via division (e.g. 123 -> 1.23)
        v = (parseFloat(v) / 100).toFixed(2) + '';

        // Now format with standard separators
        v = v.replace('.', ',');
        v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        return v;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.initUI();
});
