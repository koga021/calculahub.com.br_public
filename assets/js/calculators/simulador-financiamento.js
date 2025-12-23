/**
 * Financing Simulator Logic (Price & SAC)
 */

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('calcForm');

    // Inputs
    const elLoanValue = document.getElementById('loanValue');
    const elDownPayment = document.getElementById('downPayment');
    const elRate = document.getElementById('interestRate');
    // const elRateType = document.getElementById('rateType'); // Removed - Forced Annual
    const elPeriod = document.getElementById('period');
    const elPeriodType = document.getElementById('periodType'); // anos / meses
    const elSystem = document.getElementById('amortizationSystem'); // price / sac

    // Results Summary
    const elResTotalPaid = document.getElementById('resTotalPaid');
    const elResTotalInterest = document.getElementById('resTotalInterest');
    const elResTotalAmortized = document.getElementById('resTotalAmortized'); // Usually equal to loan amount
    const elTableBody = document.querySelector('#resultTable tbody');

    // Calculate Function
    const calculate = (e, updateUrl = true) => {
        if (e && e.preventDefault) e.preventDefault();

        // Get values
        let loanValue = App.parseCurrency(elLoanValue.value);
        let downPayment = App.parseCurrency(elDownPayment.value);
        let rate = parseFloat(elRate.value) || 0;
        let period = parseInt(elPeriod.value) || 0;
        let system = elSystem.value;

        let principal = loanValue - downPayment;

        if (loanValue <= 0 || period <= 0) {
            // clear results
            elResTotalPaid.textContent = "R$ 0,00";
            elResTotalInterest.textContent = "R$ 0,00";
            elResTotalAmortized.textContent = "R$ 0,00";
            elTableBody.innerHTML = '';
            const elChart = document.getElementById('evolutionChart');
            const elTable = document.getElementById('evolutionTable');
            if (elChart) elChart.classList.add('d-none');
            if (elTable) elTable.classList.add('d-none');
            return;
        }

        if (principal <= 0) principal = 0;

        // Convert Period to Months
        let months = (elPeriodType.value === 'anos') ? period * 12 : period;

        // Convert Rate to Monthly (Compound Equivalence for 'Anual')
        // Always treating input as Annual
        let monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;

        // Data for chart & export
        let labels = [];
        let dataInstallment = [];
        let dataAmortization = [];
        let dataInterest = [];
        window.simulationData = [];

        elTableBody.innerHTML = '';
        let tableHtml = '';

        let currentBalance = principal;
        let totalPaid = 0;
        let totalInterest = 0;
        let totalAmortized = 0;

        // Variables for Price
        let pricePMT = 0;
        if (system === 'price' && monthlyRate > 0 && months > 0) {
            pricePMT = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        }

        // Variables for SAC
        let sacAmortization = 0;
        if (system === 'sac' && months > 0) {
            sacAmortization = principal / months;
        }

        for (let m = 1; m <= months; m++) {
            let interest = currentBalance * monthlyRate;
            let amortization = 0;
            let installment = 0;

            if (system === 'price') {
                installment = pricePMT;
                // If last month, adjust slightly for rounding if needed, but standard formula usually works.
                // Re-calc amortization based on interest
                amortization = installment - interest;
            } else {
                // SAC
                amortization = sacAmortization;
                installment = amortization + interest;
            }

            // Correction for final rounding issues or negative balance
            if (currentBalance - amortization < 0.01) {
                amortization = currentBalance;
                if (system === 'price') installment = amortization + interest;
            }

            currentBalance -= amortization;
            if (currentBalance < 0) currentBalance = 0;

            totalPaid += installment;
            totalInterest += interest;
            totalAmortized += amortization;

            // Chart Data (Sampled if too large?)
            // Financing usually max 360-420 lines. We can probably show all or sample for chart.
            // Let's sample for chart if > 60 months
            let addToChart = months <= 60 || m % Math.ceil(months / 60) === 0 || m === months;

            if (addToChart) {
                labels.push(m);
                dataInstallment.push(installment);
                dataAmortization.push(amortization);
                dataInterest.push(interest);
            }

            // Store data for export (All rows)
            window.simulationData.push([
                m,
                App.formatCurrency(installment),
                App.formatCurrency(amortization),
                App.formatCurrency(interest),
                App.formatCurrency(currentBalance)
            ]);

            // Table Logic (Show first 12, collapse rest)
            // Or use the "Load More" logic from previous calc
            let shouldHide = m > 24; // Show first 2 years
            let rowClass = shouldHide ? 'collapse-row d-none' : '';

            tableHtml += `
                <tr class="${rowClass}">
                    <td>${m}</td>
                    <td>${App.formatCurrency(installment)}</td>
                    <td>${App.formatCurrency(amortization)}</td>
                    <td>${App.formatCurrency(interest)}</td>
                    <td><strong>${App.formatCurrency(currentBalance)}</strong></td>
                </tr>
            `;
        }

        // Handle case where input is 0 or invalid
        if (months <= 0 || principal <= 0) {
            // clear
        }

        // Updates UI Summary
        elResTotalPaid.textContent = App.formatCurrency(totalPaid);
        elResTotalInterest.textContent = App.formatCurrency(totalInterest);
        elResTotalAmortized.textContent = App.formatCurrency(totalAmortized);

        // Render Table
        elTableBody.innerHTML = tableHtml;

        // Button logic
        const btnToggle = document.getElementById('btnToggleTable');
        if (btnToggle) {
            if (months > 24) {
                btnToggle.classList.remove('d-none');
            } else {
                btnToggle.classList.add('d-none');
            }
        }

        // Evolution UI
        const elChart = document.getElementById('evolutionChart');
        const elTable = document.getElementById('evolutionTable');
        if (months <= 0 || principal <= 0) {
            if (elChart) elChart.classList.add('d-none');
            if (elTable) elTable.classList.add('d-none');
        } else {
            if (elChart) elChart.classList.remove('d-none');
            if (elTable) elTable.classList.remove('d-none');

            // Render Chart
            ChartHelper.init('mainChart', 'line', labels, [
                {
                    label: 'Valor da Parcela',
                    data: dataInstallment,
                    backgroundColor: 'rgba(50, 31, 219, 0.2)',
                    borderColor: 'rgba(50, 31, 219, 1)',
                    fill: false
                },
                {
                    label: 'Amortização',
                    data: dataAmortization,
                    backgroundColor: 'rgba(46, 184, 92, 0.2)',
                    borderColor: 'rgba(46, 184, 92, 1)',
                    fill: false,
                    borderDash: [5, 5]
                }
            ]);
        }

        // Update URL
        const state = {
            val: loanValue,
            ent: downPayment,
            rat: rate,
            // rtp: elRateType.value,
            per: period,
            ptp: elPeriodType.value,
            sys: elSystem.value
        };
        if (updateUrl) Share.updateURL(state);
    };

    // Load State
    const loadState = () => {
        const state = Share.loadFromURL();
        if (state) {
            if (state.val) elLoanValue.value = App.formatNumber(state.val);
            if (state.ent) elDownPayment.value = App.formatNumber(state.ent);
            if (state.rat) elRate.value = state.rat;
            // if (state.rtp) elRateType.value = state.rtp;
            if (state.per) elPeriod.value = state.per;
            if (state.ptp) elPeriodType.value = state.ptp;
            if (state.sys) elSystem.value = state.sys;
            calculate();
        } else {
            // Init with default calc? Or wait for user?
            // Usually better to have a default demo
            // calculate(null, false); // No default calc
        }
    };

    // Event Listeners
    form.addEventListener('submit', calculate);
    document.getElementById('shareBtn').addEventListener('click', Share.copyLink);

    document.getElementById('resetBtn').addEventListener('click', () => {
        elLoanValue.value = '';
        elDownPayment.value = '';
        elRate.value = '';
        // elRateType.value = 'anual';
        elPeriod.value = '';

        Share.updateURL({});

        calculate();
    });

    const btnToggle = document.getElementById('btnToggleTable');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            document.querySelectorAll('.collapse-row').forEach(r => r.classList.remove('d-none'));
            btnToggle.classList.add('d-none');
        });
    }

    // Export Functions (reused logic)
    const getFileName = (ext) => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        return `Simulacao_Financiamento_${dateStr}.${ext}`;
    };

    const getExportData = () => {
        const headers = [['Mês', 'Parcela (R$)', 'Amortização (R$)', 'Juros (R$)', 'Saldo Devedor (R$)']];
        const data = window.simulationData || [];
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Financiamento");
        return wb;
    };

    const exportExcel = () => XLSX.writeFile(getExportData(), getFileName('xlsx'));
    const exportCSV = () => XLSX.writeFile(getExportData(), getFileName('csv'));

    const exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text("Relatório de Financiamento - CalculaHub", 14, 20);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 26);

        // Summary
        doc.text(`Valor Financiado: ${elLoanValue.value}`, 14, 35);
        doc.text(`Sistema: ${elSystem.options[elSystem.selectedIndex].text}`, 14, 40);

        doc.text(`Total Pago: ${elResTotalPaid.textContent}`, 100, 35);
        doc.text(`Total Juros: ${elResTotalInterest.textContent}`, 100, 40);

        doc.autoTable({
            head: [['Mês', 'Parcela', 'Amortização', 'Juros', 'Saldo Dev.']],
            body: window.simulationData || [],
            startY: 50,
            theme: 'striped',
            headStyles: { fillColor: [50, 31, 219] },
            didDrawPage: (data) => {
                App.addPdfDisclaimer(doc);
            }
        });

        doc.save(getFileName('pdf'));
    };

    document.querySelectorAll('.js-export-excel').forEach(b => b.addEventListener('click', exportExcel));
    document.querySelectorAll('.js-export-csv').forEach(b => b.addEventListener('click', exportCSV));
    document.querySelectorAll('.js-export-pdf').forEach(b => b.addEventListener('click', exportPDF));

    loadState();
});
