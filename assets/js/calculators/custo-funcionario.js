// Calculadora de Custo Real do Funcionário (CLT)
// Tabelas e Alíquotas 2024/2025

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('calcForm');
    const elGrossSalary = document.getElementById('grossSalary');
    const elDependents = document.getElementById('dependents');
    const elShowAnnual = document.getElementById('showAnnual');
    const elShowTaxDetails = document.getElementById('showTaxDetails');
    const resetBtn = document.getElementById('resetBtn');
    const shareBtn = document.getElementById('shareBtn');

    // Result elements
    const resultsArea = document.getElementById('resultsArea');
    const elResNetSalary = document.getElementById('resNetSalary');
    const elResInssEmployee = document.getElementById('resInssEmployee');
    const elResIrrfEmployee = document.getElementById('resIrrfEmployee');
    const elResTotalEmployeeTax = document.getElementById('resTotalEmployeeTax');
    const elCompanyChargesList = document.getElementById('companyChargesList');
    const elResTotalCompanyCharges = document.getElementById('resTotalCompanyCharges');
    const elResTotalMonthlyCost = document.getElementById('resTotalMonthlyCost');
    const elAnnualCostContainer = document.getElementById('annualCostContainer');
    const elResTotalAnnualCost = document.getElementById('resTotalAnnualCost');
    const elResTaxImpactPercent = document.getElementById('resTaxImpactPercent');
    const elResImpactPhrase = document.getElementById('resImpactPhrase');

    // Constants
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

    // Company Rates
    const COMPANY_RATES = {
        PATRONAL: 0.20,
        FGTS: 0.08,
        FGTS_MULTA: 0.032,
        RAT_TERCEIROS: 0.03
    };

    // Apply money mask and initial state
    if (typeof App !== 'undefined' && App.applyMoneyMask) {
        App.applyMoneyMask();
    }

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

    const calculateIRRF = (base) => {
        if (base <= 0) return 0;
        let bracket = IRRF_TABLE.find(b => base <= b.limit) || IRRF_TABLE[IRRF_TABLE.length - 1];

        // Normal vs Simplified Comparison
        const normalIR = Math.max(0, (base * bracket.rate) - bracket.deduction);
        const simplifiedIR = Math.max(0, base - SIMPLIFIED_DEDUCTION) * (bracket.rate || 0.075); // Simplified usually applies if base is low

        // Note: Real simplified logic is complex, using standard for consistency with existing calc
        return normalIR;
    };

    const calculate = () => {
        const gross = App.parseCurrency(elGrossSalary.value);
        const dependents = parseInt(elDependents.value) || 0;
        const showAnnual = elShowAnnual.checked;

        if (gross <= 0) {
            resultsArea.style.display = 'none';
            return;
        }

        // 1. Employee Calculations
        const inssEmployee = calculateINSS(gross);
        const dependentDeduction = dependents * DEPENDENT_DEDUCTION;
        const irBase = Math.max(0, gross - inssEmployee - dependentDeduction);
        let irrfEmployee = calculateIRRF(irBase);

        // Regra de Isenção Prática: Bruto <= R$ 5.000,00 -> IRRF = 0
        if (gross <= 5000) {
            irrfEmployee = 0;
        }

        const netSalary = gross - inssEmployee - irrfEmployee;

        // 2. Company Calculations
        const patronal = gross * COMPANY_RATES.PATRONAL;
        const fgts = gross * COMPANY_RATES.FGTS;
        const fgtsMulta = gross * COMPANY_RATES.FGTS_MULTA;
        const ratTerceiros = gross * COMPANY_RATES.RAT_TERCEIROS;
        const totalMonthlyCharges = patronal + fgts + fgtsMulta + ratTerceiros;
        const totalMonthlyCost = gross + totalMonthlyCharges;

        // 3. Proportions for Annual (13th and Vacation)
        // 13th = 1/12 of (gross + charges)
        // Vacation = (1/12 * 1.333) of (gross + charges)
        const totalChargeRate = COMPANY_RATES.PATRONAL + COMPANY_RATES.FGTS + COMPANY_RATES.FGTS_MULTA + COMPANY_RATES.RAT_TERCEIROS;
        const monthlyPovision13 = (gross / 12) * (1 + totalChargeRate);
        const monthlyProvisionVacation = ((gross * 1.3333) / 12) * (1 + totalChargeRate);

        const totalAnnualCost = (totalMonthlyCost * 12) + (gross * 1.3333 * (1 + totalChargeRate)) + (gross * (1 + totalChargeRate));
        // Simpler approach for "Annual Projection" as requested: (Custo Mensal * 13.33)
        const estimatedAnnualCost = totalMonthlyCost * 13.333; // Approx 12 months + 13th + 1/3 vacation


        // Update UI
        elResNetSalary.textContent = App.formatCurrency(netSalary);
        elResInssEmployee.textContent = App.formatCurrency(inssEmployee);
        elResIrrfEmployee.textContent = App.formatCurrency(irrfEmployee);
        elResTotalEmployeeTax.textContent = App.formatCurrency(inssEmployee + irrfEmployee);

        // Company Charges List
        let chargesHTML = '';
        const addChargeRow = (label, value) => {
            chargesHTML += `<div class="d-flex justify-content-between mb-1">
                <span>${label}</span>
                <span class="text-primary">${App.formatCurrency(value)}</span>
            </div>`;
        };

        addChargeRow('INSS Patronal (20%)', patronal);
        addChargeRow('FGTS (8%)', fgts);
        addChargeRow('FGTS Multa Provisão (3,2%)', fgtsMulta);
        addChargeRow('RAT + Terceiros (3%)', ratTerceiros);

        if (showAnnual) {
            addChargeRow('Provisão 13º (Mensal)', monthlyPovision13);
            addChargeRow('Provisão Férias + 1/3 (Mensal)', monthlyProvisionVacation);
        }

        elCompanyChargesList.innerHTML = chargesHTML;

        const totalEffectiveCharges = totalMonthlyCharges + (showAnnual ? (monthlyPovision13 + monthlyProvisionVacation) : 0);
        elResTotalCompanyCharges.textContent = App.formatCurrency(totalEffectiveCharges);

        const effectiveMonthlyCost = gross + totalEffectiveCharges;
        elResTotalMonthlyCost.textContent = App.formatCurrency(effectiveMonthlyCost);

        if (showAnnual) {
            elAnnualCostContainer.style.display = 'block';
            elResTotalAnnualCost.textContent = App.formatCurrency(effectiveMonthlyCost * 12);
        } else {
            elAnnualCostContainer.style.display = 'none';
        }

        // Impacto Real: Custo Total Mensal (com provisões se ativado) / Salário Líquido
        const totalTaxesAndEncargos = (effectiveMonthlyCost - netSalary);
        const taxImpactPercent = (totalTaxesAndEncargos / effectiveMonthlyCost) * 100;
        const impactRatio = effectiveMonthlyCost / netSalary;

        elResTaxImpactPercent.textContent = `${taxImpactPercent.toFixed(1)}% em Impostos/Encargos`;
        elResImpactPhrase.innerHTML = `Para cada <strong>R$ 1,00</strong> que você recebe, o custo para a empresa é <strong>${App.formatCurrency(impactRatio)}</strong>`;

        resultsArea.style.display = 'block';

        // Update URL
        Share.updateURL({
            g: gross,
            d: dependents,
            a: showAnnual ? 1 : 0,
            t: elShowTaxDetails.checked ? 1 : 0
        });
    };

    // Events
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        elGrossSalary.value = '';
        elDependents.value = '0';
        resultsArea.style.display = 'none';
        Share.updateURL({});
    });

    shareBtn.addEventListener('click', () => {
        Share.copyLink();
    });

    // Handle PDF Export
    const exportPDF = () => {
        if (typeof jspdf === 'undefined') return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Relatório: Custo Real do Funcionário (CLT)", 14, 20);

        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 28);

        const gross = elGrossSalary.value;
        const net = elResNetSalary.textContent;
        const cost = elResTotalMonthlyCost.textContent;

        doc.setFontSize(12);
        doc.text("Resumo:", 14, 40);
        doc.text(`Salário Bruto: ${gross}`, 14, 48);
        doc.text(`Salário Líquido Mensal: ${net}`, 14, 54);
        doc.text(`Custo Total Mensal para Empresa: ${cost}`, 14, 60);

        doc.autoTable({
            startY: 70,
            head: [['Descrição', 'Valor']],
            body: [
                ['INSS Funcionário', elResInssEmployee.textContent],
                ['IRRF Funcionário', elResIrrfEmployee.textContent],
                ['INSS Patronal', App.formatCurrency(App.parseCurrency(elGrossSalary.value) * 0.2)],
                ['FGTS', App.formatCurrency(App.parseCurrency(elGrossSalary.value) * 0.08)],
                ['FGTS Provisão Multa', App.formatCurrency(App.parseCurrency(elGrossSalary.value) * 0.032)],
                ['RAT + Terceiros', App.formatCurrency(App.parseCurrency(elGrossSalary.value) * 0.03)],
                ['Custo Total Mensal', elResTotalMonthlyCost.textContent]
            ],
            theme: 'striped',
            headStyles: { fillColor: [50, 31, 219] }
        });

        App.addPdfDisclaimer(doc);
        doc.save(`Custo_Funcionario_${Date.now()}.pdf`);
    };

    document.querySelectorAll('.js-export-pdf').forEach(btn => {
        btn.addEventListener('click', exportPDF);
    });

    // Load initial state
    const params = Share.loadFromURL();
    if (params && params.g) {
        elGrossSalary.value = App.formatCurrency(params.g);
        elDependents.value = params.d || 0;
        elShowAnnual.checked = params.a == 1;
        elShowTaxDetails.checked = params.t == 1;
        calculate();
    }
});
