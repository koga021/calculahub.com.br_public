/**
 * BMI (IMC) Calculator Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('calcForm');

    // Inputs
    const elWeight = document.getElementById('weight');
    const elHeight = document.getElementById('height');

    // Results
    const elResBMI = document.getElementById('resBMI');
    const elResStatus = document.getElementById('resStatus');

    // Rows to highlight
    const rows = {
        magrezaGrave: document.getElementById('row-magreza-grave'),
        magrezaMod: document.getElementById('row-magreza-moderada'),
        magrezaLeve: document.getElementById('row-magreza-leve'),
        normal: document.getElementById('row-normal'),
        over: document.getElementById('row-over'),
        obese1: document.getElementById('row-obesity-1'),
        obese2: document.getElementById('row-obesity-2'),
        obese3: document.getElementById('row-obesity-3'),
    };

    // Calculate Function
    const calculate = (e) => {
        if (e) e.preventDefault();

        const w = parseFloat(elWeight.value);
        const h_cm = parseFloat(elHeight.value);

        if (!w || !h_cm) return;

        const h_m = h_cm / 100;
        const bmi = w / (h_m * h_m);
        const bmiFormatted = bmi.toFixed(2);

        elResBMI.textContent = bmiFormatted;

        // Classify
        let status = '';
        let colorClass = 'bg-secondary';
        let rowId = '';

        // Reset Table rows
        Object.values(rows).forEach(r => { if (r) r.classList.remove('table-active', 'fw-bold') });

        if (bmi < 16.0) {
            status = 'Magreza grave';
            colorClass = 'bg-danger';
            rowId = 'magrezaGrave';
        } else if (bmi <= 16.9) {
            status = 'Magreza moderada';
            colorClass = 'bg-warning';
            rowId = 'magrezaMod';
        } else if (bmi <= 18.4) {
            status = 'Magreza leve';
            colorClass = 'bg-warning';
            rowId = 'magrezaLeve';
        } else if (bmi <= 24.9) {
            status = 'Normal';
            colorClass = 'bg-success';
            rowId = 'normal';
        } else if (bmi <= 29.9) {
            status = 'Sobrepeso';
            colorClass = 'bg-warning';
            rowId = 'over';
        } else if (bmi <= 34.9) {
            status = 'Obesidade';
            colorClass = 'bg-danger';
            rowId = 'obese1';
        } else if (bmi <= 39.9) {
            status = 'Obesidade';
            colorClass = 'bg-danger';
            rowId = 'obese2';
        } else {
            status = 'Obesidade Grave (Mórbida)';
            colorClass = 'bg-danger text-white';
            rowId = 'obese3';
        }

        elResStatus.textContent = status;
        elResStatus.className = `fs-4 badge ${colorClass}`;

        if (rows[rowId]) {
            rows[rowId].classList.add('table-active', 'fw-bold');
        }

        // Chart
        renderChart(bmi);

        // Update URL
        Share.updateURL({ w: w, h: h_cm });
    };

    const renderChart = (userBMI) => {
        // Simple comparison chart
        ChartHelper.init('bmiChart', 'bar', ['Você', 'Min Ideal', 'Max Ideal'], [
            {
                label: 'IMC',
                data: [userBMI, 18.5, 25],
                backgroundColor: [
                    'rgba(50, 31, 219, 0.8)', // Primary (User)
                    'rgba(46, 184, 92, 0.4)', // Success
                    'rgba(46, 184, 92, 0.4)'
                ],
                borderWidth: 1
            }
        ], {
            indexAxis: 'y',
        });
    };

    // Helper: Generate Filename
    const getFileName = (ext) => {
        const now = new Date();
        const dateStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + '-' +
            String(now.getMinutes()).padStart(2, '0');
        const hash = Math.random().toString(36).substring(2, 7);
        return `Relatorio_IMC_${dateStr}_${hash}.${ext}`;
    };

    // Export PDF
    const exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 1. Title
        doc.setFontSize(16);
        doc.text("Relatório de IMC - CalculaHub", 14, 20);

        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 14, 26);

        // 2. Data
        const w = elWeight.value;
        const h = elHeight.value;
        const result = elResBMI.textContent;
        const status = elResStatus.textContent;

        doc.setFontSize(12);
        doc.text("Seus Dados:", 14, 40);
        doc.setFontSize(10);
        doc.text(`Peso: ${w} kg`, 14, 48);
        doc.text(`Altura: ${h} cm`, 14, 54);

        doc.setFontSize(12);
        doc.text("Resultado:", 100, 40);
        doc.setFontSize(10);
        doc.text(`Seu IMC: ${result}`, 100, 48);
        doc.setFont(undefined, 'bold');
        doc.text(`Classificação: ${status}`, 100, 54);
        doc.setFont(undefined, 'normal');

        // 3. Classification Table (Reference)
        doc.text("Referência (OMS):", 14, 70);
        doc.autoTable({
            head: [['IMC', 'Classificação', 'Grau']],
            body: [
                ['Menor que 16,0', 'Magreza grave', '0'],
                ['16,0 a 16,9', 'Magreza moderada', '0'],
                ['17,0 a 18,4', 'Magreza leve', '0'],
                ['18,5 a 24,9', 'Normal', '0'],
                ['25,0 a 29,9', 'Sobrepeso', 'I'],
                ['30,0 a 34,9', 'Obesidade', 'I'],
                ['35,0 a 39,9', 'Obesidade', 'II'],
                ['Maior ou igual a 40,0', 'Obesidade Grave (Mórbida)', 'III'],
            ],
            startY: 75,
            theme: 'striped',
            headStyles: { fillColor: [50, 31, 219] }
        });

        App.addPdfDisclaimer(doc);
        doc.save(getFileName('pdf'));
    };

    // Load State
    const loadState = () => {
        const state = Share.loadFromURL();
        if (state) {
            elWeight.value = state.w;
            elHeight.value = state.h;
            calculate();
        }
    };

    form.addEventListener('submit', calculate);
    document.getElementById('shareBtn').addEventListener('click', Share.copyLink);

    // Reset
    const btnReset = document.getElementById('resetBtn');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            elWeight.value = '';
            elHeight.value = '';

            Share.updateURL({});

            elResBMI.textContent = '--';
            elResStatus.textContent = 'Aguardando cálculo';
            elResStatus.className = 'fs-4 badge bg-secondary';

            Object.values(rows).forEach(r => { if (r) r.classList.remove('table-active', 'fw-bold') });

            renderChart(0);
        });
    }

    const btnPDF = document.getElementById('btnExportPDF');
    if (btnPDF) {
        btnPDF.addEventListener('click', exportPDF);
    }

    loadState();
});
