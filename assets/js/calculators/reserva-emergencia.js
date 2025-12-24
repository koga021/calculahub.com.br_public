// Calculadora de Reserva de Emergência
// CalculaHub - 2025

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('calcForm');
    const elMonthlyExpenses = document.getElementById('monthlyExpenses');
    const elMonths = document.getElementById('coverageMonths');
    const resetBtn = document.getElementById('resetBtn');

    // Result elements
    const resTotal = document.getElementById('resTotalReserve');
    const resBreakdown = document.getElementById('resBreakdownTable');
    const resultsArea = document.getElementById('resultsArea');

    // Initialize UI (Masks, etc)
    if (typeof App !== 'undefined' && App.initUI) {
        App.initUI();
    }

    // Main calculation
    const calculate = () => {
        const expenses = App.parseCurrency(elMonthlyExpenses.value);
        const months = parseInt(elMonths.value) || 6;

        if (expenses <= 0) return;

        const total = expenses * months;

        // Update UI
        resTotal.textContent = App.formatCurrency(total);

        // Build Breakdown
        let html = '';
        const scenarios = [
            { label: 'Essencial (3 meses)', months: 3 },
            { label: 'Segurança (6 meses)', months: 6 },
            { label: 'Conforto (12 meses)', months: 12 }
        ];

        html = scenarios.map(s => {
            const val = expenses * s.months;
            const isActive = s.months === months ? 'table-primary fw-bold' : '';
            return `
                <tr class="${isActive}">
                    <td>${s.label}</td>
                    <td class="text-end">${App.formatCurrency(val)}</td>
                </tr>
            `;
        }).join('');

        resBreakdown.innerHTML = html;
        resultsArea.style.display = 'block';

        // Update URL
        Share.updateURL({
            e: expenses,
            m: months
        });

        // State for Exports
        window.simulationData = scenarios.map(s => [s.label, App.formatCurrency(expenses * s.months)]);
        window.resSummary = {
            monthly: expenses,
            duration: months,
            total: total
        };
    };

    // Export PDF
    const exportPDF = () => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            if (!window.resSummary || !window.simulationData) {
                alert("Por favor, realize o cálculo antes de exportar.");
                return;
            }

            doc.setFontSize(16);
            doc.text("Relatório de Reserva de Emergência - CalculaHub", 14, 20);

            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);
            doc.text(`Custo de Vida Mensal: ${App.formatCurrency(window.resSummary.monthly)}`, 14, 38);
            doc.text(`Meses de Cobertura: ${window.resSummary.duration} meses`, 14, 44);

            doc.setFont(undefined, 'bold');
            doc.text(`RESERVA TOTAL RECOMENDADA: ${App.formatCurrency(window.resSummary.total)}`, 14, 52);
            doc.setFont(undefined, 'normal');

            doc.autoTable({
                head: [['Perfil / Cenário', 'Valor da Reserva']],
                body: window.simulationData,
                startY: 60,
                theme: 'striped',
                headStyles: { fillColor: [50, 31, 219] },
                didDrawPage: (data) => {
                    App.addPdfDisclaimer(doc);
                }
            });

            const fileName = `CalculaHub_Reserva_${new Date().getTime()}.pdf`;

            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 100);
            } else {
                doc.save(fileName);
            }
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF.");
        }
    };

    // Events
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        resultsArea.style.display = 'none';
        Share.updateURL({});
    });

    document.querySelectorAll('.js-export-pdf').forEach(btn => {
        btn.addEventListener('click', exportPDF);
    });

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            Share.copyLink();
        });
    }

    // Load initial state
    const params = Share.loadFromURL();
    if (params && params.e) {
        elMonthlyExpenses.value = App.formatCurrency(parseFloat(params.e));
        if (params.m) elMonths.value = params.m;
        calculate();
    }
});
