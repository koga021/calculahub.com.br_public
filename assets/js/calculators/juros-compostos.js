/**
 * Compound Interest Calculator Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('calcForm');

    // Inputs
    const elInitial = document.getElementById('initialValue');
    const elMonthly = document.getElementById('monthlyValue');
    const elRate = document.getElementById('interestRate');
    const elType = document.getElementById('interestType');
    const elPeriod = document.getElementById('periodYears');

    // Results
    const elResInvested = document.getElementById('resTotalInvested');
    const elResInterest = document.getElementById('resTotalInterest');
    const elResFinal = document.getElementById('resTotalFinal');
    const elTableBody = document.querySelector('#resultTable tbody');

    // Calculate Function
    const calculate = (e, updateUrl = true) => {
        if (e && e.preventDefault) e.preventDefault();

        // Get values
        let initial = App.parseCurrency(elInitial.value);
        let monthly = App.parseCurrency(elMonthly.value);
        let rate = parseFloat(elRate.value) || 0;
        let years = parseInt(elPeriod.value) || 0;
        let isAnnual = elType.value === 'anual';

        // Check for empty state
        if (years <= 0 || (initial === 0 && monthly === 0)) {
            // clear results
            elResInvested.textContent = "R$ 0,00";
            elResInterest.textContent = "R$ 0,00";
            elResFinal.textContent = "R$ 0,00";
            elTableBody.innerHTML = '';

            const elChart = document.getElementById('evolutionChart');
            const elTable = document.getElementById('evolutionTable');
            if (elChart) elChart.classList.add('d-none');
            if (elTable) elTable.classList.add('d-none');
            return;
        }

        // Convert rate to monthly
        let monthlyRate = isAnnual ? (Math.pow(1 + rate / 100, 1 / 12) - 1) : (rate / 100);
        let totalMonths = years * 12;

        let currentAmount = initial;
        let totalInvested = initial;

        // Data for chart
        let labels = [];
        let dataInvested = [];
        let dataInterest = [];

        // Data for PDF Export
        window.simulationData = [];

        // Clear table
        elTableBody.innerHTML = '';
        let tableHtml = '';

        for (let m = 1; m <= totalMonths; m++) {
            // Add interest first
            let interest = currentAmount * monthlyRate;
            currentAmount += interest;

            // Add monthly contribution
            currentAmount += monthly;
            totalInvested += monthly;

            // Calculate label variables
            let totalInterest = currentAmount - totalInvested;
            let year = Math.ceil(m / 12);

            // Logic: Show first 24 months, hide the rest by default
            let shouldHide = m > 10;
            let rowClass = shouldHide ? 'collapse-row d-none' : '';

            // Chart sampling: For performance on very long periods check modulo
            // We keep chart cleaner by sampling (e.g. yearly)
            let addToChart = m % 12 === 0 || m === totalMonths || (years <= 2);
            if (addToChart) {
                labels.push(year + ' anos');
                dataInvested.push(totalInvested);
                dataInterest.push(totalInterest);
            }

            // Store data for export
            window.simulationData.push([
                m,
                App.formatCurrency(interest),
                App.formatCurrency(totalInvested),
                App.formatCurrency(currentAmount)
            ]);

            // Table Row: ALWAYS ADD (but maybe hidden)
            tableHtml += `
                <tr class="${rowClass}">
                    <td>${m}</td>
                    <td>${App.formatCurrency(interest)}</td>
                    <td>${App.formatCurrency(totalInvested)}</td>
                    <td><strong>${App.formatCurrency(currentAmount)}</strong></td>
                </tr>
            `;
        }

        // Update Summary
        let totalInterest = currentAmount - totalInvested;
        elResInvested.textContent = App.formatCurrency(totalInvested);
        elResInterest.textContent = App.formatCurrency(totalInterest);
        elResFinal.textContent = App.formatCurrency(currentAmount);

        // Render Table
        elTableBody.innerHTML = tableHtml;

        // Reset button visibility
        const btnToggle = document.getElementById('btnToggleTable');
        if (btnToggle) {
            if (totalMonths > 24) {
                btnToggle.classList.remove('d-none');
            } else {
                btnToggle.classList.add('d-none');
            }
        }

        // Logic to Hide/Show Evolution
        const elChart = document.getElementById('evolutionChart');
        const elTable = document.getElementById('evolutionTable');

        // If no period or no values, hide evolution
        if (years <= 0 || (initial === 0 && monthly === 0)) {
            if (elChart) elChart.classList.add('d-none');
            if (elTable) elTable.classList.add('d-none');
            // Ensure summary is zeroed (it is already done above)
        } else {
            if (elChart) elChart.classList.remove('d-none');
            if (elTable) elTable.classList.remove('d-none');

            // Render Chart only if visible
            ChartHelper.init('mainChart', 'line', labels, [
                {
                    label: 'Total Investido',
                    data: dataInvested,
                    backgroundColor: 'rgba(50, 31, 219, 0.2)', // Primary
                    borderColor: 'rgba(50, 31, 219, 1)',
                    fill: true
                },
                {
                    label: 'Total Acumulado',
                    data: dataInvested.map((v, i) => v + dataInterest[i]),
                    backgroundColor: 'rgba(46, 184, 92, 0.2)', // Success
                    borderColor: 'rgba(46, 184, 92, 1)',
                    fill: true
                }
            ]);
        }

        // Updates Share URL
        const state = {
            ini: initial,
            mon: monthly,
            rat: rate,
            typ: elType.value,
            yrs: years
        };
        if (updateUrl) {
            Share.updateURL(state);
        }
    };

    // Load from URL
    const loadState = () => {
        const state = Share.loadFromURL();
        if (state) {
            elInitial.value = App.formatNumber(state.ini);
            elMonthly.value = App.formatNumber(state.mon);
            elRate.value = state.rat;
            elType.value = state.typ;
            elPeriod.value = state.yrs;

            calculate();
        } else {
            // Initial run - Don't update URL to keep it clean
            // Initial run - Don't update URL to keep it clean
            // calculate(null, false);
        }
    };

    // Event Listeners
    form.addEventListener('submit', calculate);
    document.getElementById('shareBtn').addEventListener('click', Share.copyLink);

    // Reset Logic
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Reset to defaults
            elInitial.value = '';
            elMonthly.value = '';
            elRate.value = '';
            elPeriod.value = '';
            elType.value = 'anual';

            Share.updateURL({});
            calculate();
        });
    }

    // Toggle Table
    const btnToggle = document.getElementById('btnToggleTable');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            const hiddenRows = document.querySelectorAll('.collapse-row');
            hiddenRows.forEach(row => row.classList.remove('d-none'));
            btnToggle.classList.add('d-none');
        });
    }

    // Export Logic
    const getFileName = (ext) => {
        const now = new Date();
        const dateStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + '-' +
            String(now.getMinutes()).padStart(2, '0');
        const hash = Math.random().toString(36).substring(2, 7);
        return `Relatorio_Juros_Compostos_${dateStr}_${hash}.${ext}`;
    };

    const getExportData = () => {
        const headers = [['Mês', 'Juros (R$)', 'Investido (R$)', 'Total Acumulado (R$)']];
        const data = window.simulationData || [];
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Simulação");
        return wb;
    };

    const exportExcel = () => {
        const wb = getExportData();
        XLSX.writeFile(wb, getFileName('xlsx'));
    };

    const exportCSV = () => {
        const wb = getExportData();
        XLSX.writeFile(wb, getFileName('csv'));
    };

    const exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 1. Title
        doc.setFontSize(16);
        doc.text("Relatório de Simulação - CalculaHub", 14, 20);

        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 14, 26);

        // 2. Input Parameters & Results Summary
        doc.setFontSize(11);
        doc.text("Resumo da Simulação:", 14, 35);

        doc.setFontSize(10);

        // Inputs
        const initial = document.getElementById('initialValue').value;
        const monthly = document.getElementById('monthlyValue').value;
        const rate = document.getElementById('interestRate').value;
        const type = document.getElementById('interestType');
        const typeText = type.options[type.selectedIndex].text;
        const years = document.getElementById('periodYears').value;

        // Results
        const totalInvested = document.getElementById('resTotalInvested').textContent;
        const totalInterest = document.getElementById('resTotalInterest').textContent;
        const totalFinal = document.getElementById('resTotalFinal').textContent;

        // Column 1 - Inputs
        doc.text(`Valor Inicial: ${initial}`, 14, 42);
        doc.text(`Aporte Mensal: ${monthly}`, 14, 48);
        doc.text(`Taxa de Juros: ${rate}% (${typeText})`, 14, 54);
        doc.text(`Período: ${years} anos`, 14, 60);

        // Column 2 - Results
        doc.text(`Total Investido: ${totalInvested}`, 100, 42);
        doc.text(`Renimento Juros: ${totalInterest}`, 100, 48);
        doc.setFont(undefined, 'bold');
        doc.text(`Valor Total Final: ${totalFinal}`, 100, 54);
        doc.setFont(undefined, 'normal');

        // 3. Data Table (All Months)
        doc.autoTable({
            head: [['Mês', 'Juros (R$)', 'Investido (R$)', 'Total Acumulado (R$)']],
            body: window.simulationData || [],
            startY: 70, // Start below summary
            theme: 'striped',
            headStyles: { fillColor: [50, 31, 219] },
            styles: { fontSize: 8 }
        });

        doc.save(getFileName('pdf'));
    };

    // Attach Listeners
    document.querySelectorAll('.js-export-excel').forEach(btn => {
        btn.addEventListener('click', exportExcel);
    });

    document.querySelectorAll('.js-export-csv').forEach(btn => {
        btn.addEventListener('click', exportCSV);
    });

    document.querySelectorAll('.js-export-pdf').forEach(btn => {
        btn.addEventListener('click', exportPDF);
    });

    // Init
    loadState();
});
