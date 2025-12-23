// Calculadora CLT x PJ - CalculaHub
// Atualizado 2024/2025

document.addEventListener('DOMContentLoaded', () => {
    // CLT Elements
    const elCltGross = document.getElementById('cltGrossSalary');
    const elCltBenefits = document.getElementById('cltBenefits');
    const elCltDependents = document.getElementById('cltDependents');

    // PJ Elements
    const elPjBilling = document.getElementById('pjTotalBilling');
    const elPjType = document.getElementById('pjType');
    const elPjProLabore = document.getElementById('pjProLabore');
    const elPjAccounting = document.getElementById('pjAccounting');

    // Forms and Buttons
    const form = document.getElementById('calcForm');
    const resetBtn = document.getElementById('resetBtn');
    const shareBtn = document.getElementById('shareBtn');
    const resultsArea = document.getElementById('resultsArea');

    // Result Display Elements
    const resCltTotal = document.getElementById('resCltTotal');
    const resCltNet = document.getElementById('resCltNet');
    const resCltFGTS = document.getElementById('resCltFGTS');
    const resCltBenefits = document.getElementById('resCltBenefits');

    const resPjTotal = document.getElementById('resPjTotal');
    const resPjImposto = document.getElementById('resPjImposto');
    const resPjEncargos = document.getElementById('resPjEncargos');
    const resPjCosts = document.getElementById('resPjCosts');

    const resVerdict = document.getElementById('resVerdict');
    const resDifference = document.getElementById('resDifference');
    const resAnnualDifference = document.getElementById('resAnnualDifference');

    // Tabelas 2024/2025
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

    const MEI_DAS_FIXED = 75.00; // Valor aproximado MEI 2024 (Serviços)
    const SIMPLIFIED_DEDUCTION = 528.00;
    const DEPENDENT_DEDUCTION = 189.59;

    // Helper: Calculate INSS (reused from salario-liquido)
    const calculateINSS = (grossSalary) => {
        let inss = 0;
        let previousLimit = 0;
        for (let bracket of INSS_TABLE) {
            const taxableAmount = Math.min(grossSalary, bracket.limit) - previousLimit;
            if (taxableAmount > 0) inss += taxableAmount * bracket.rate;
            previousLimit = bracket.limit;
            if (grossSalary <= bracket.limit) break;
        }
        return inss;
    };

    // Helper: Calculate IRRF (reused from salario-liquido)
    const calculateIRRF = (taxBase) => {
        if (taxBase <= 0) return 0;
        let bracket = IRRF_TABLE.find(b => taxBase <= b.limit) || IRRF_TABLE[IRRF_TABLE.length - 1];

        const normalIR = Math.max(0, (taxBase * bracket.rate) - bracket.deduction);
        const simplifiedIR = Math.max(0, taxBase - SIMPLIFIED_DEDUCTION) * bracket.rate;

        return Math.min(normalIR, simplifiedIR);
    };

    const calculate = () => {
        // --- CLT CALCULATION ---
        const cltGross = App.parseCurrency(elCltGross.value) || 0;
        const cltBen = App.parseCurrency(elCltBenefits.value) || 0;
        const cltDep = parseInt(elCltDependents.value) || 0;

        const cltInss = calculateINSS(cltGross);
        const cltIrBase = Math.max(0, cltGross - cltInss - (cltDep * DEPENDENT_DEDUCTION));
        const cltIrrf = calculateIRRF(cltIrBase);
        const cltNet = cltGross - cltInss - cltIrrf;
        const cltFGTS = cltGross * 0.08;
        const cltTotalMensal = cltNet + cltFGTS + cltBen;

        // Proporção anual CLT: (12 salários + 13º + 1/3 Férias) = 13.33 + FGTS anual + Benefícios x 12
        // Simplificado para comparação mensal equivalente:
        const cltAnualTotal = (cltNet * 13.33) + (cltFGTS * 13.33) + (cltBen * 12);
        const cltEquivalenteMensal = cltAnualTotal / 12;

        // --- PJ CALCULATION ---
        const pjBilling = App.parseCurrency(elPjBilling.value) || 0;
        const pjType = elPjType.value;
        const pjProLabore = App.parseCurrency(elPjProLabore.value) || 0;
        const pjAccounting = App.parseCurrency(elPjAccounting.value) || 0;

        let pjTax = 0;
        if (pjType === 'MEI') {
            pjTax = MEI_DAS_FIXED;
        } else if (pjType === 'SIMPLES_3') {
            pjTax = pjBilling * 0.06; // Alíquota inicial Anexo III
        } else if (pjType === 'SIMPLES_5') {
            pjTax = pjBilling * 0.155; // Alíquota inicial Anexo V
        }

        // Encargos sobre Pró-labore
        const pjInssSocio = pjProLabore * 0.11; // Retenção pró-labore é 11% fixo para sócio
        const pjIrBase = Math.max(0, pjProLabore - pjInssSocio);
        const pjIrrfSocio = calculateIRRF(pjIrBase);
        const pjEncargos = pjInssSocio + pjIrrfSocio;

        const pjTotalMensal = pjBilling - pjTax - pjEncargos - pjAccounting;
        const pjAnualTotal = pjTotalMensal * 12;

        // --- UPDATE UI ---
        resCltTotal.textContent = App.formatCurrency(cltTotalMensal);
        resCltNet.textContent = App.formatCurrency(cltNet);
        resCltFGTS.textContent = App.formatCurrency(cltFGTS);
        resCltBenefits.textContent = App.formatCurrency(cltBen);

        resPjTotal.textContent = App.formatCurrency(pjTotalMensal);
        resPjImposto.textContent = App.formatCurrency(pjTax);
        resPjEncargos.textContent = App.formatCurrency(pjEncargos);
        resPjCosts.textContent = App.formatCurrency(pjAccounting);

        const diff = Math.abs(pjTotalMensal - cltTotalMensal);
        resDifference.textContent = App.formatCurrency(diff);

        // Diferença anual considerando 13º/Férias da CLT
        const annualDiff = Math.abs(pjAnualTotal - cltAnualTotal);
        resAnnualDifference.textContent = App.formatCurrency(annualDiff);

        if (pjTotalMensal > cltTotalMensal) {
            resVerdict.innerHTML = 'O regime <strong class="text-success">PJ</strong> é financeiramente mais vantajoso no curto prazo.';
        } else {
            resVerdict.innerHTML = 'O regime <strong class="text-primary">CLT</strong> é financeiramente mais vantajoso.';
        }

        resultsArea.style.display = 'block';
        resultsArea.scrollIntoView({ behavior: 'smooth' });

        // Update Global state for exports
        window.simulationData = [
            ['Regime', 'Mensal Total', 'Líquido Base', 'Encargos/Impostos', 'Benefícios/Custos'],
            ['CLT', App.formatCurrency(cltTotalMensal), App.formatCurrency(cltNet), App.formatCurrency(cltInss + cltIrrf), App.formatCurrency(cltBen + cltFGTS)],
            ['PJ', App.formatCurrency(pjTotalMensal), App.formatCurrency(pjBilling - pjTax), App.formatCurrency(pjTax + pjEncargos), App.formatCurrency(pjAccounting)]
        ];

        // URL State
        Share.updateURL({
            cg: cltGross,
            cb: cltBen,
            cd: cltDep,
            pb: pjBilling,
            pt: pjType,
            pl: pjProLabore,
            pa: pjAccounting
        });
    };

    // Events
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        form.reset();
        resultsArea.style.display = 'none';
        Share.updateURL({});
    });

    shareBtn.addEventListener('click', () => {
        Share.copyLink();
    });

    // Money mask if available
    if (typeof App !== 'undefined' && App.applyMoneyMask) {
        App.applyMoneyMask();
    }

    // Load from URL
    const params = Share.loadFromURL();
    if (params) {
        if (params.cg) elCltGross.value = App.formatCurrency(params.cg);
        if (params.cb) elCltBenefits.value = App.formatCurrency(params.cb);
        if (params.cd) elCltDependents.value = params.cd;
        if (params.pb) elPjBilling.value = App.formatCurrency(params.pb);
        if (params.pt) elPjType.value = params.pt;
        if (params.pl) elPjProLabore.value = App.formatCurrency(params.pl);
        if (params.pa) elPjAccounting.value = App.formatCurrency(params.pa);
        if (params.cg || params.pb) calculate();
    }

    // Export PDF
    const exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text("Comparativo CLT x PJ - CalculaHub", 14, 20);

        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 28);

        doc.autoTable({
            head: [window.simulationData[0]],
            body: [window.simulationData[1], window.simulationData[2]],
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [50, 31, 219] },
            didDrawPage: (data) => {
                App.addPdfDisclaimer(doc);
            }
        });

        App.addPdfDisclaimer(doc); // Added this line as per instruction

        doc.text(resVerdict.innerText, 14, doc.lastAutoTable.finalY + 15);
        doc.text(`Diferença Mensal: ${resDifference.textContent}`, 14, doc.lastAutoTable.finalY + 22);
        doc.text(`Diferença Anual (Projetada): ${resAnnualDifference.textContent}`, 14, doc.lastAutoTable.finalY + 29);

        doc.save(`CalculaHub_CLT_x_PJ_${new Date().getTime()}.pdf`);
    };

    document.querySelectorAll('.js-export-pdf').forEach(btn => {
        btn.addEventListener('click', exportPDF);
    });
});
