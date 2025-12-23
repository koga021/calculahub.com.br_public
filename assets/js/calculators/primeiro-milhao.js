/**
 * First Million Calculator Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('calcForm');

    // Inputs
    const elInitial = document.getElementById('initialValue');
    const elMonthly = document.getElementById('monthlyValue');
    const elRate = document.getElementById('interestRate');
    const elType = document.getElementById('interestType');

    // Results
    const elResTime = document.getElementById('resTime');
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
        let isAnnual = elType.value === 'anual';
        let target = 1000000;

        // Convert rate to monthly
        let monthlyRate = isAnnual ? (Math.pow(1 + rate / 100, 1 / 12) - 1) : (rate / 100);

        // Sanity Check
        if (monthlyRate <= 0 && monthly <= 0) {
            if (initial <= 0) {
                // Clear UI for empty form
                elResTime.textContent = '0 Anos e 0 Meses';
                elResInvested.textContent = 'R$ 0,00';
                elResInterest.textContent = 'R$ 0,00';
                elResFinal.textContent = 'R$ 0,00';
                elTableBody.innerHTML = '';
                return;
            } else {
                // Impossible calculation if there is initial value but no growth
                alert("Para atingir 1 milhão, a taxa de juros ou o aporte mensal deve ser maior que zero.");
                return;
            }
        }

        // Calculation: Time to reach Target
        // Using Loop for accurate month-by-month table/chart data anyway
        // Or Formula: n = log( (FV * i + PMT) / (PV * i + PMT) ) / log(1 + i)

        let currentAmount = initial;
        let totalInvested = initial;
        let months = 0;
        let maxMonths = 1200; // 100 years safety break (avoids infinite loops if args bad)

        // Data for PDF/Exports
        window.simulationData = [];
        let labels = [];
        let dataInvested = [];
        let dataInterest = [];

        let annualSnapshot = [];


        // Simulation Loop
        while (currentAmount < target && months < maxMonths) {
            months++;

            // Add interest
            let interest = currentAmount * monthlyRate;
            currentAmount += interest;

            // Add monthly contribution
            currentAmount += monthly;
            totalInvested += monthly;

            // Snapshot for Annual Table
            if (months % 12 === 0 || currentAmount >= target) {
                let year = Math.ceil(months / 12);
                let accInterest = currentAmount - totalInvested;

                annualSnapshot.push({
                    year: year,
                    invested: totalInvested,
                    interest: accInterest,
                    total: currentAmount
                });
            }
        }

        if (months >= maxMonths) {
            elResTime.textContent = "> 100 Anos";
        } else {
            let yearsRes = Math.floor(months / 12);
            let monthsRes = months % 12;
            elResTime.textContent = `${yearsRes} Anos e ${monthsRes} Meses`;
        }

        // Final Totals
        let finalInterest = currentAmount - totalInvested;

        elResInvested.textContent = App.formatCurrency(totalInvested);
        elResInterest.textContent = App.formatCurrency(finalInterest);
        elResFinal.textContent = App.formatCurrency(currentAmount);

        // Render Pie Chart (Invested vs Interest)
        ChartHelper.init('mainChart', 'pie', ['Total Investido', 'Total em Juros'], [
            {
                data: [totalInvested, finalInterest],
                backgroundColor: ['rgba(50, 31, 219, 0.7)', 'rgba(46, 184, 92, 0.7)'],
                hoverOffset: 4
            }
        ]);


        // Render Annual Table
        elTableBody.innerHTML = '';
        annualSnapshot.forEach((row, index) => {
            // Logic: Show first 20 years, hide the rest by default
            let shouldHide = index >= 20;
            let rowClass = shouldHide ? 'collapse-row d-none' : '';

            let tr = `
                <tr class="${rowClass}">
                    <td>${row.year}º Ano</td>
                    <td>${App.formatCurrency(row.invested)}</td>
                    <td>${App.formatCurrency(row.interest)}</td>
                    <td><strong>${App.formatCurrency(row.total)}</strong></td>
                </tr>
            `;
            elTableBody.innerHTML += tr;

            // Store for export
            window.simulationData.push([
                row.year,
                App.formatCurrency(row.invested),
                App.formatCurrency(row.interest),
                App.formatCurrency(row.total)
            ]);
        });

        // Reset visibility (Show Load More if needed)
        const btnToggle = document.getElementById('btnToggleTable');
        if (btnToggle) {
            if (annualSnapshot.length > 20) {
                btnToggle.classList.remove('d-none');
            } else {
                btnToggle.classList.add('d-none');
            }
        }




        // Updates Share URL
        const state = {
            ini: initial,
            mon: monthly,
            rat: rate,
            typ: elType.value
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
            calculate();
        } else {
            // calculate(null, false);
        }
    };

    // Event Listeners
    form.addEventListener('submit', calculate);
    document.getElementById('shareBtn').addEventListener('click', Share.copyLink);

    // Toggle Table
    const btnToggle = document.getElementById('btnToggleTable');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            const hiddenRows = document.querySelectorAll('.collapse-row');
            hiddenRows.forEach(row => row.classList.remove('d-none'));
            btnToggle.classList.add('d-none');
        });
    }

    // Reset Logic
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            elInitial.value = '';
            elMonthly.value = '';
            elRate.value = '';

            Share.updateURL({});

            elResTime.textContent = '0 Anos';
            elResInvested.textContent = 'R$ 0,00';
            elResInterest.textContent = 'R$ 0,00';
            elResFinal.textContent = 'R$ 0,00';
            elTableBody.innerHTML = '';
            window.simulationData = [];

            if (btnToggle) btnToggle.classList.add('d-none');

            const chartCanvas = document.getElementById('mainChart');
            // Chart destroy helper logic usually needed, but ChartHelper.init handles re-creation
            if (window.myCharts && window.myCharts['mainChart']) {
                window.myCharts['mainChart'].destroy();
            }
        });
    }

    // Export Logic
    const getFileName = (ext) => {
        const now = new Date();
        const dateStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
        const hash = Math.random().toString(36).substring(2, 7);
        return `Primeiro_Milhao_${dateStr}_${hash}.${ext}`;
    };

    const getExportData = () => {
        const headers = [['Ano', 'Investido (R$)', 'Juros (R$)', 'Total (R$)']];
        const data = window.simulationData || [];
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Primeiro Milhão");
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

        // Title
        doc.setFontSize(16);
        doc.text("Planejamento do Primeiro Milhão - CalculaHub", 14, 20);

        // Summary
        doc.setFontSize(11);
        doc.text(`Tempo Estimado: ${elResTime.textContent}`, 14, 40);
        doc.text(`Total Investido: ${elResInvested.textContent}`, 14, 48);
        doc.text(`Total Juros: ${elResInterest.textContent}`, 14, 56);
        doc.text(`Valor Final: ${elResFinal.textContent}`, 14, 64);

        // Table
        doc.autoTable({
            head: [['Ano', 'Investido', 'Juros', 'Total']],
            body: window.simulationData || [],
            startY: 75,
            theme: 'striped',
            headStyles: { fillColor: [46, 184, 92] },
            didDrawPage: (data) => {
                App.addPdfDisclaimer(doc);
            }
        });

        doc.save(getFileName('pdf'));
    };

    // Attach Listeners
    document.querySelectorAll('.js-export-excel').forEach(btn => btn.addEventListener('click', exportExcel));
    document.querySelectorAll('.js-export-csv').forEach(btn => btn.addEventListener('click', exportCSV));
    document.querySelectorAll('.js-export-pdf').forEach(btn => btn.addEventListener('click', exportPDF));

    // Init
    loadState();
});
