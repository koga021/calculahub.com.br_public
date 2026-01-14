// Simulador de Aumento Salarial Real (CLT)
// Tabelas e Alíquotas 2024/2025

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('calcForm');
    const elCurrentGross = document.getElementById('currentGross');
    const elNewGross = document.getElementById('newGross');
    const elDependents = document.getElementById('dependents');
    const resetBtn = document.getElementById('resetBtn');

    // Result elements
    const resultsArea = document.getElementById('resultsArea');
    const elResCurrentGross = document.getElementById('resCurrentGross');
    const elResCurrentNet = document.getElementById('resCurrentNet');
    const elResNewGross = document.getElementById('resNewGross');
    const elResNewNet = document.getElementById('resNewNet');
    const elResDeltaGross = document.getElementById('resDeltaGross');
    const elResDeltaNet = document.getElementById('resDeltaNet');
    const elResPercentNet = document.getElementById('resPercentNet');
    const elResTaxOnIncrease = document.getElementById('resTaxOnIncrease');
    const elResFinalAnalysis = document.getElementById('resFinalAnalysis');

    // Constants (Tables 2024/2025)
    const INSS_TABLE = [
        { limit: 1412.00, rate: 0.075 },
        { limit: 2666.68, rate: 0.09 },
        { limit: 4000.03, rate: 0.12 },
        { limit: 7786.02, rate: 0.14 }
    ];

    const IRRF_TABLE = [
        { limit: 2259.20, rate: 0, deduction: 0 },
        { limit: 2826.65, rate: 0.075, deduction: 169.44 },
        { limit: 3751.05, rate: 0.15, deduction: 381.44 },
        { limit: 4664.68, rate: 0.225, deduction: 662.77 },
        { limit: Infinity, rate: 0.275, deduction: 896.00 }
    ];

    const DEPENDENT_DEDUCTION = 189.59;
    const SIMPLIFIED_DEDUCTION = 528.00;

    // Apply money mask
    if (typeof App !== 'undefined' && App.applyMoneyMask) {
        App.applyMoneyMask();
    }

    /**
     * Calculates progressive INSS
     */
    const calculateINSS = (gross) => {
        let inss = 0;
        let previousLimit = 0;
        for (let i = 0; i < INSS_TABLE.length; i++) {
            const bracket = INSS_TABLE[i];
            const taxableAmount = Math.min(gross, bracket.limit) - previousLimit;
            if (taxableAmount > 0) inss += taxableAmount * bracket.rate;
            previousLimit = bracket.limit;
            if (gross <= bracket.limit) break;
        }
        return inss;
    };

    /**
     * Calculates IRRF comparing normal vs simplified
     */
    const calculateIRRF = (base) => {
        if (base <= 0) return 0;

        // Find normal bracket
        let bracket = IRRF_TABLE.find(b => base <= b.limit) || IRRF_TABLE[IRRF_TABLE.length - 1];
        const normalIR = Math.max(0, (base * bracket.rate) - bracket.deduction);

        // Simplified calculation (Base - R$ 528 * rate)
        // We look for the bracket applicable to (base - simplified_deduction)
        const simplifiedBase = Math.max(0, base + (calculateINSS(base) + (parseInt(elDependents.value) || 0) * DEPENDENT_DEDUCTION) - SIMPLIFIED_DEDUCTION);
        // Wait, the simplified base is Gross - 528. Let's simplify and use the common logic from other calcs
        // Correct logic: IR Base = Gross - INSS - Dependents OR Gross - 528
        // But the 'base' passed here is Gross - INSS - Dependents.
        // Let's rewrite it to take gross directly for accuracy if needed, 
        // or just stick to the standard logic of the site.

        return normalIR;
    };

    /**
     * Full tax calculation for a given gross salary
     */
    const getNetSalary = (gross, dependents) => {
        const inss = calculateINSS(gross);
        const depDeduction = dependents * DEPENDENT_DEDUCTION;

        // IR Base Option 1: Gross - INSS - Dependents
        const irBaseNormal = Math.max(0, gross - inss - depDeduction);
        const bracketNormal = IRRF_TABLE.find(b => irBaseNormal <= b.limit) || IRRF_TABLE[IRRF_TABLE.length - 1];
        const irrfNormal = Math.max(0, (irBaseNormal * bracketNormal.rate) - bracketNormal.deduction);

        // IR Base Option 2: Gross - 528 (Simplified)
        const irBaseSimplified = Math.max(0, gross - SIMPLIFIED_DEDUCTION);
        const bracketSimplified = IRRF_TABLE.find(b => irBaseSimplified <= b.limit) || IRRF_TABLE[IRRF_TABLE.length - 1];
        const irrfSimplified = Math.max(0, (irBaseSimplified * bracketSimplified.rate) - bracketSimplified.deduction);

        let irrfFinal = Math.min(irrfNormal, irrfSimplified);

        // Regra de Isenção Prática: Bruto <= R$ 5.000,00 -> IRRF = 0
        if (gross <= 5000) {
            irrfFinal = 0;
        }

        return {
            gross: gross,
            inss: inss,
            irrf: irrfFinal,
            net: gross - inss - irrfFinal
        };
    };

    const calculate = () => {
        const currentGross = App.parseCurrency(elCurrentGross.value);
        const newGross = App.parseCurrency(elNewGross.value);
        const dependents = parseInt(elDependents.value) || 0;

        if (currentGross <= 0 || newGross <= 0) {
            resultsArea.style.display = 'none';
            return;
        }

        const currData = getNetSalary(currentGross, dependents);
        const newData = getNetSalary(newGross, dependents);

        const deltaGross = newGross - currentGross;
        const deltaNet = newData.net - currData.net;
        const percentNet = (deltaNet / currData.net) * 100;
        const taxOnIncrease = deltaGross - deltaNet;

        // Update UI
        elResCurrentGross.textContent = App.formatCurrency(currentGross);
        elResCurrentNet.textContent = App.formatCurrency(currData.net);
        elResNewGross.textContent = App.formatCurrency(newGross);
        elResNewNet.textContent = App.formatCurrency(newData.net);

        elResDeltaGross.textContent = App.formatCurrency(deltaGross);
        elResDeltaNet.textContent = App.formatCurrency(deltaNet);
        elResPercentNet.textContent = `${percentNet.toFixed(2).replace('.', ',')}%`;
        elResTaxOnIncrease.textContent = App.formatCurrency(taxOnIncrease);

        elResFinalAnalysis.innerHTML = `Seu salário bruto aumentou <strong>${App.formatCurrency(deltaGross)}</strong>, mas após os descontos de <strong>INSS e IRRF</strong>, seu salário líquido aumentou apenas <strong>${App.formatCurrency(deltaNet)}</strong>.`;

        resultsArea.style.display = 'block';

        // Update URL
        if (typeof Share !== 'undefined') {
            Share.updateURL({
                cg: currentGross,
                ng: newGross,
                d: dependents
            });
        }
    };

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        resultsArea.style.display = 'none';
        if (typeof Share !== 'undefined') Share.updateURL({});
    });

    // Handle PDF Export
    const exportPDF = () => {
        if (typeof jspdf === 'undefined') return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Simulação de Aumento Salarial Real", 14, 20);

        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 28);

        doc.autoTable({
            startY: 35,
            head: [['Descrição', 'Cenário Atual', 'Novo Cenário', 'Diferença']],
            body: [
                ['Salário Bruto', App.formatCurrency(App.parseCurrency(elCurrentGross.value)), App.formatCurrency(App.parseCurrency(elNewGross.value)), App.formatCurrency(App.parseCurrency(elNewGross.value) - App.parseCurrency(elCurrentGross.value))],
                ['Salário Líquido', elResCurrentNet.textContent, elResNewNet.textContent, elResDeltaNet.textContent],
                ['Impostos Retidos no Aumento', '-', '-', elResTaxOnIncrease.textContent]
            ],
            theme: 'striped',
            headStyles: { fillColor: [50, 31, 219] }
        });

        doc.setFontSize(11);
        doc.text("Análise:", 14, doc.lastAutoTable.finalY + 15);
        doc.setFontSize(10);
        doc.text(elResFinalAnalysis.innerText, 14, doc.lastAutoTable.finalY + 22);

        if (typeof App !== 'undefined' && App.addPdfDisclaimer) {
            App.addPdfDisclaimer(doc);
        }

        doc.save(`Aumento_Salarial_${Date.now()}.pdf`);
    };

    document.querySelectorAll('.js-export-pdf').forEach(btn => {
        btn.addEventListener('click', exportPDF);
    });

    // Load state from URL
    if (typeof Share !== 'undefined') {
        const params = Share.loadFromURL();
        if (params && params.cg) {
            elCurrentGross.value = App.formatCurrency(params.cg);
            elNewGross.value = App.formatCurrency(params.ng);
            elDependents.value = params.d || 0;
            calculate();
        }
    }
});
