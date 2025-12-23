/**
 * Charts Helper for CalculaHub
 * Wrapper around Chart.js
 */

const ChartHelper = {
    instance: null,

    init: (canvasId, type, labels, datasets, options = {}) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Destroy previous instance if exists to avoid overlays
        if (ChartHelper.instance) {
            ChartHelper.instance.destroy();
        }

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        };

        const config = {
            type: type,
            data: {
                labels: labels,
                datasets: datasets
            },
            options: { ...defaultOptions, ...options }
        };

        ChartHelper.instance = new Chart(ctx, config);
        return ChartHelper.instance;
    }
};
