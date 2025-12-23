/**
 * Compound Interest Calculator Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('calcForm');

    // Inputs
    const elInitial = document.getElementById('initialValue');
    const elRate = document.getElementById('interestRate');
    const elRateType = document.getElementById('interestType'); // Renamed var for clarity
    const elPeriod = document.getElementById('periodValue'); // Corrected ID
    const elPeriodType = document.getElementById('periodType'); // Corrected ID

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
        let rate = parseFloat(elRate.value) || 0;
        let periodInput = parseInt(elPeriod.value) || 0;



        // Check empty state
        if (initial <= 0 && rate <= 0) {
            elTableBody.innerHTML = '';
            // Clear results Summary
            elResInvested.textContent = 'R$ 0,00';
            elResInterest.textContent = 'R$ 0,00';
            elResFinal.textContent = 'R$ 0,00';

            // Hide Containers
            const elChart = document.getElementById('evolutionChart');
            const elTable = document.getElementById('evolutionTable');
            if (elChart) elChart.classList.add('d-none');
            if (elTable) elTable.classList.add('d-none');
            return;
        }

        // Handle defaults if somehow elements are missing (sanity check)
        if (!elPeriodType) return;

        let isRateAnnual = elRateType.value === 'anual';
        let isPeriodYears = elPeriodType.value === 'anos';

        // Normalize Time to Months for Calculation
        let totalMonths = isPeriodYears ? (periodInput * 12) : periodInput;

        // Normalize Rate to Monthly (Simple Interest nominal)
        // If Rate is Annual: Monthly = Rate / 12
        // If Rate is Monthly: Monthly = Rate
        let monthlyRate = isRateAnnual ? (rate / 12 / 100) : (rate / 100);

        // Core Calculation (Total)
        // J = C * i_monthly * total_months
        let totalInterest = initial * monthlyRate * totalMonths;
        let totalInvested = initial; // Principal is constant
        let totalFinal = initial + totalInterest;

        // --- View Logic ---
        // User requesting full monthly details even for years.
        // We will default to Monthly view but use collapsing for UI.
        let viewMode = 'monthly';

        // Data for chart/table
        let labels = [];
        let dataInvested = [];
        let dataInterest = [];
        window.simulationData = []; // For PDF

        elTableBody.innerHTML = '';
        let tableHtml = '';

        // Table Headers - Always Monthly
        const tableHeaderRow = document.querySelector('#resultTable thead tr');
        if (tableHeaderRow) {
            tableHeaderRow.innerHTML = `
                <th>Mês</th>
                <th>Juros Mensal</th>
                <th>Principal</th>
                <th>Montante</th>
            `;
        }
        // Save View Mode for PDF
        window.currentViewMode = viewMode;

        let currentAccInterest = 0;
        // Iterate Months
        for (let m = 1; m <= totalMonths; m++) {
            let interestThisMonth = initial * monthlyRate;
            currentAccInterest += interestThisMonth;
            let currentTotal = initial + currentAccInterest;

            // Chart sampling to avoid overcrowding
            // If total months is huge (e.g. 360), maybe skip some labels?
            // For now, let's add all, Chart.js usually handles density okayish, or we optimize later.
            let addToChart = true;
            if (totalMonths > 50) {
                // Sample every 6 months or so if very large? 
                // Let's keep it simple: Add all data points, Chart.js decimates labels automatically often.
            }

            labels.push(m);
            dataInvested.push(initial);
            dataInterest.push(currentAccInterest);

            window.simulationData.push([
                m,
                App.formatCurrency(interestThisMonth),
                App.formatCurrency(initial),
                App.formatCurrency(currentTotal)
            ]);

            // Logic: Show first 24 months, hide the rest by default
            let shouldHide = m > 24;
            let rowClass = shouldHide ? 'collapse-row d-none' : '';

            tableHtml += `
                <tr class="${rowClass}">
                    <td>${m}</td>
                    <td>${App.formatCurrency(interestThisMonth)}</td>
                    <td>${App.formatCurrency(initial)}</td>
                    <td><strong>${App.formatCurrency(currentTotal)}</strong></td>
                </tr>
            `;
        }

        // Update Summary
        elResInvested.textContent = App.formatCurrency(totalInvested);
        elResInterest.textContent = App.formatCurrency(totalInterest);
        elResFinal.textContent = App.formatCurrency(totalFinal);

        // Render Table
        elTableBody.innerHTML = tableHtml;

        // Reset visibility (Show Load More if needed)
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

        if (totalMonths <= 0 || initial === 0) {
            if (elChart) elChart.classList.add('d-none');
            if (elTable) elTable.classList.add('d-none');
        } else {
            if (elChart) elChart.classList.remove('d-none');
            if (elTable) elTable.classList.remove('d-none');

            ChartHelper.init('mainChart', 'line', labels, [
                {
                    label: 'Valor Principal',
                    data: dataInvested,
                    backgroundColor: 'rgba(50, 31, 219, 0.2)',
                    borderColor: 'rgba(50, 31, 219, 1)',
                    fill: true
                },
                {
                    label: 'Montante Total',
                    data: dataInvested.map((v, i) => v + dataInterest[i]),
                    backgroundColor: 'rgba(57, 246, 226, 0.2)',
                    borderColor: 'rgba(57, 246, 226, 1)',
                    fill: true
                }
            ]);
        }

        // Updates Share URL
        const state = {
            ini: initial,
            rat: rate,
            rtyp: elRateType.value,
            per: periodInput,
            ptyp: elPeriodType.value
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
            elRate.value = state.rat;
            elRateType.value = state.rtyp || state.typ || 'anual';
            elPeriod.value = state.per || state.yrs;
            elPeriodType.value = state.ptyp || 'anos';

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
            // 1. Clear Inputs
            elInitial.value = '';
            elRate.value = '';
            elPeriod.value = '';
            // Reset selects to defaults if desired, or keep last? Usually User wants full clear
            elRateType.value = 'anual';
            elPeriodType.value = 'anos';

            Share.updateURL({});

            // 2. Clear Results Summary
            elResInvested.textContent = 'R$ 0,00';
            elResInterest.textContent = 'R$ 0,00';
            elResFinal.textContent = 'R$ 0,00';

            // 3. Clear Table
            elTableBody.innerHTML = '';
            window.simulationData = [];

            // 4. Hide Containers
            const elChart = document.getElementById('evolutionChart');
            const elTable = document.getElementById('evolutionTable');
            if (elChart) elChart.classList.add('d-none');
            if (elTable) elTable.classList.add('d-none');

            // 5. Hide Load More
            const btnToggle = document.getElementById('btnToggleTable');
            if (btnToggle) btnToggle.classList.add('d-none');

            // Do NOT call calculate(), so it stays clean
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

    // Helper: Generate Filename
    const getFileName = (ext) => {
        const now = new Date();
        const dateStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + '-' +
            String(now.getMinutes()).padStart(2, '0');
        const hash = Math.random().toString(36).substring(2, 7);
        // Ensure strictly simple interest filename
        return `Relatorio_Juros_Simples_${dateStr}_${hash}.${ext}`;
    };

    const exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 1. Title
        doc.setFontSize(16);
        doc.text("Relatório de Juros Simples - CalculaHub", 14, 20);

        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 14, 26);

        // 2. Input Parameters & Results Summary
        doc.setFontSize(11);
        doc.text("Resumo da Simulação:", 14, 35);

        doc.setFontSize(10);

        // Inputs
        const initial = document.getElementById('initialValue').value;
        const rate = document.getElementById('interestRate').value;
        const rateType = document.getElementById('interestType');
        const rateTypeText = rateType.options[rateType.selectedIndex].text;

        const period = document.getElementById('periodValue').value;
        const periodType = document.getElementById('periodType');
        const periodTypeText = periodType.options[periodType.selectedIndex].text;

        // Results
        const totalInvested = document.getElementById('resTotalInvested').textContent;
        const totalInterest = document.getElementById('resTotalInterest').textContent;
        const totalFinal = document.getElementById('resTotalFinal').textContent;

        // Column 1 - Inputs
        doc.text(`Valor Inicial: ${initial}`, 14, 42);
        doc.text(`Taxa de Juros: ${rate}% (${rateTypeText})`, 14, 48);
        doc.text(`Período: ${period} ${periodTypeText}`, 14, 54);

        // Column 2 - Results
        doc.text(`Valor Principal: ${totalInvested}`, 100, 42);
        doc.text(`Total Juros: ${totalInterest}`, 100, 48);
        doc.setFont(undefined, 'bold');
        doc.text(`Montante Final: ${totalFinal}`, 100, 54);
        doc.setFont(undefined, 'normal');

        // 3. Dynamic Table Headers
        let headers = [];
        if (window.currentViewMode === 'monthly') {
            headers = [['Mês', 'Juros Mensal', 'Principal', 'Montante']];
        } else {
            headers = [['Ano', 'Juros Anual', 'Principal', 'Montante']];
        }

        doc.autoTable({
            head: headers,
            body: window.simulationData || [],
            startY: 70, // Start below summary
            theme: 'striped',
            headStyles: { fillColor: [50, 31, 219] },
            styles: { fontSize: 8 },
            didDrawPage: (data) => {
                App.addPdfDisclaimer(doc);
            }
        });

        doc.save(getFileName('pdf'));
    };

    document.querySelectorAll('.js-export-pdf').forEach(btn => {
        btn.addEventListener('click', exportPDF);
    });

    // Init
    loadState();
});
