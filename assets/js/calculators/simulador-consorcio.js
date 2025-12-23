/**
 * Consortium Simulator Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('calcForm');

    // Inputs
    const elLetterValue = document.getElementById('letterValue');
    const elPeriod = document.getElementById('period');
    const elAdminRate = document.getElementById('adminRate');
    const elReserveRate = document.getElementById('reserveRate');
    const elBidValue = document.getElementById('bidValue');

    // Results Summary
    const elResInstallment = document.getElementById('resInstallment');
    const elResTotalCost = document.getElementById('resTotalCost');
    const elResTotalFees = document.getElementById('resTotalFees');

    // Bid Result Area
    const elBidResultArea = document.getElementById('bidResultArea');
    const elResNewInstallment = document.getElementById('resNewInstallment'); // If bid reduces installment
    const elResBidDiscount = document.getElementById('resBidDiscount');

    const elTableBody = document.querySelector('#resultTable tbody');

    // Calculate Function
    const calculate = (e, updateUrl = true) => {
        if (e && e.preventDefault) e.preventDefault();

        // Get values
        let letterValue = App.parseCurrency(elLetterValue.value);
        let period = parseInt(elPeriod.value) || 0;
        let adminRateTotal = parseFloat(elAdminRate.value) || 0; // Total rate over period
        let reserveRateTotal = parseFloat(elReserveRate.value) || 0; // Total rate over period
        let bidValue = App.parseCurrency(elBidValue.value);

        if (period <= 0 || letterValue <= 0) {
            // If empty, clear results
            elResInstallment.textContent = "R$ 0,00";
            elResTotalCost.textContent = "R$ 0,00";
            elResTotalFees.textContent = "R$ 0,00";
            elTableBody.innerHTML = '';
            if (elBidResultArea) elBidResultArea.classList.add('d-none');
            return;
        }

        // Calculations
        let totalAdminFee = letterValue * (adminRateTotal / 100);
        let totalReserveFund = letterValue * (reserveRateTotal / 100);
        let totalDebt = letterValue + totalAdminFee + totalReserveFund;

        let installment = totalDebt / period;

        // Breakdown per month
        let monthlyAdmin = totalAdminFee / period;
        let monthlyReserve = totalReserveFund / period;
        let monthlyCommon = letterValue / period; // "Fundo Comum"

        // Bid Logic (Lance)
        // Assumption: Bid reduces the Outstanding Balance (Saldo Devedor).
        // For comparison, we show the "New Installment" keeping the same term.
        // Or users might want to reduce term. Let's assume reduce installment for this view.
        let hasBid = bidValue > 0;
        let newInstallment = 0;
        let bidEffectiveness = '';

        if (hasBid) {
            // Check if bid is valid (less than total debt)
            if (bidValue >= totalDebt) {
                bidValue = totalDebt; // Cap at total
            }

            let remainingDebt = totalDebt - bidValue;
            // Recalculate installment over same period (minus 0? Usually bid is paid after contemplation)
            // Simplified: New Installment = Remaining Debt / Remaining Period
            // *Usually contemplation happens at month X, but for simulation we treat as "If I give this bid, what happens?"
            // We'll assume the bid is diluted over the WHOLE period for the sake of "Planning Installment"
            // OR strictly: (TotalDebt - Bid) / Period
            newInstallment = remainingDebt / period;
        }

        // Data for export
        window.simulationData = [];
        elTableBody.innerHTML = '';
        let tableHtml = '';

        let currentBalance = totalDebt;

        // Populate Table
        for (let m = 1; m <= period; m++) {

            // If bid reduces balance at start (simulation mode), logic is linear
            // Real consortium is cleaner: Monthly Installment is Fixed (usually indexed). Bid creates "amortization".

            currentBalance -= installment;
            if (currentBalance < 0.01) currentBalance = 0;

            window.simulationData.push([
                m,
                App.formatCurrency(installment),
                App.formatCurrency(monthlyCommon),
                App.formatCurrency(monthlyAdmin + monthlyReserve),
                App.formatCurrency(currentBalance)
            ]);

            // Show first 24 months in table UI to save space
            let shouldHide = m > 24;
            let rowClass = shouldHide ? 'collapse-row d-none' : '';

            tableHtml += `
                <tr class="${rowClass}">
                    <td>${m}</td>
                    <td><strong>${App.formatCurrency(installment)}</strong></td>
                    <td>${App.formatCurrency(monthlyCommon)}</td>
                    <td>${App.formatCurrency(monthlyAdmin + monthlyReserve)}</td>
                    <td>${App.formatCurrency(currentBalance)}</td>
                </tr>
            `;
        }

        // Updates UI Summary
        elResInstallment.textContent = App.formatCurrency(installment);
        elResTotalCost.textContent = App.formatCurrency(totalDebt);
        elResTotalFees.textContent = App.formatCurrency(totalAdminFee + totalReserveFund);

        // Bid UI
        if (hasBid && elBidResultArea) {
            elBidResultArea.classList.remove('d-none');
            elResNewInstallment.textContent = App.formatCurrency(newInstallment);
            let savings = installment - newInstallment;
            elResBidDiscount.textContent = `Redução de ${App.formatCurrency(savings)}/mês`;
        } else if (elBidResultArea) {
            elBidResultArea.classList.add('d-none');
        }

        // Render Table
        elTableBody.innerHTML = tableHtml;

        // Button logic
        const btnToggle = document.getElementById('btnToggleTable');
        if (btnToggle) {
            if (period > 24) {
                btnToggle.classList.remove('d-none');
            } else {
                btnToggle.classList.add('d-none');
            }
        }

        // Update URL
        const state = {
            val: letterValue,
            per: period,
            adm: adminRateTotal,
            res: reserveRateTotal,
            bid: bidValue
        };
        if (updateUrl) Share.updateURL(state);
    };

    // Load State
    const loadState = () => {
        const state = Share.loadFromURL();
        if (state) {
            if (state.val) elLetterValue.value = App.formatNumber(state.val);
            if (state.per) elPeriod.value = state.per;
            if (state.adm) elAdminRate.value = state.adm;
            if (state.res) elReserveRate.value = state.res;
            if (state.bid) elBidValue.value = App.formatNumber(state.bid);
            calculate();
        } else {
            // Init with default calc
            // calculate(null, false); // No default calc
        }
    };

    // Event Listeners
    form.addEventListener('submit', calculate);
    document.getElementById('shareBtn').addEventListener('click', Share.copyLink);

    document.getElementById('resetBtn').addEventListener('click', () => {
        elLetterValue.value = '';
        elPeriod.value = '';
        elAdminRate.value = '';
        elReserveRate.value = '';
        elBidValue.value = '';

        // Update URL to remove params
        Share.updateURL({});

        // Clear results Visuals manually or call calculate
        calculate();
    });

    const btnToggle = document.getElementById('btnToggleTable');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            document.querySelectorAll('.collapse-row').forEach(r => r.classList.remove('d-none'));
            btnToggle.classList.add('d-none');
        });
    }

    // Export Functions
    const getFileName = (ext) => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        return `Simulacao_Consorcio_${dateStr}.${ext}`;
    };

    const getExportData = () => {
        const headers = [['Mês', 'Parcela (R$)', 'Fundo Comum (R$)', 'Taxas (R$)', 'Saldo Devedor (R$)']];
        const data = window.simulationData || [];
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Consorcio");
        return wb;
    };

    const exportExcel = () => XLSX.writeFile(getExportData(), getFileName('xlsx'));
    const exportCSV = () => XLSX.writeFile(getExportData(), getFileName('csv'));

    const exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text("Relatório de Consórcio - CalculaHub", 14, 20);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 26);

        // Summary
        doc.text(`Carta de Crédito: ${elLetterValue.value}`, 14, 35);
        doc.text(`Prazo: ${elPeriod.value} meses`, 14, 40);

        doc.text(`Parcela Mensal: ${elResInstallment.textContent}`, 100, 35);
        doc.text(`Custo Total: ${elResTotalCost.textContent}`, 100, 40);

        doc.autoTable({
            head: [['Mês', 'Parcela', 'F. Comum', 'Taxas', 'Saldo']],
            body: window.simulationData || [],
            startY: 50,
            theme: 'striped',
            headStyles: { fillColor: [50, 31, 219] },
        });

        doc.save(getFileName('pdf'));
    };

    document.querySelectorAll('.js-export-excel').forEach(b => b.addEventListener('click', exportExcel));
    document.querySelectorAll('.js-export-csv').forEach(b => b.addEventListener('click', exportCSV));
    document.querySelectorAll('.js-export-pdf').forEach(b => b.addEventListener('click', exportPDF));

    loadState();
});
