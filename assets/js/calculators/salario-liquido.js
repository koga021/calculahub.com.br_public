// Calculadora de Salário Líquido CLT
// Atualizado com tabelas 2024/2025

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('calcForm');
    const elGrossSalary = document.getElementById('grossSalary');
    const elDependents = document.getElementById('dependents');
    const elOtherDiscounts = document.getElementById('otherDiscounts');
    const elTransportVoucher = document.getElementById('transportVoucher');
    const elTransportValue = document.getElementById('transportValue');
    const resetBtn = document.getElementById('resetBtn');
    const shareBtn = document.getElementById('shareBtn');

    // Result elements
    const elResGross = document.getElementById('resGrossSalary');
    const elResINSS = document.getElementById('resINSS');
    const elResIRRF = document.getElementById('resIRRF');
    const elResOthers = document.getElementById('resOthers');
    const elResNet = document.getElementById('resNetSalary');

    const elINSSDetails = document.getElementById('inssDetails');
    const elIRDetails = document.getElementById('irDetails');
    const elTableBody = document.querySelector('#resultTable tbody');
    const evolutionTable = document.getElementById('evolutionTable');

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

    const DEPENDENT_DEDUCTION = 189.59;
    const SIMPLIFIED_DEDUCTION = 528.00;

    // Apply money mask
    if (typeof App !== 'undefined' && App.applyMoneyMask) {
        App.applyMoneyMask();
    }

    // Transport voucher toggle
    if (elTransportVoucher) {
        elTransportVoucher.addEventListener('change', () => {
            elTransportValue.disabled = !elTransportVoucher.checked;
            if (!elTransportVoucher.checked) {
                elTransportValue.value = '';
            }
        });
    }

    // Calculate progressive INSS
    const calculateINSS = (grossSalary) => {
        let inss = 0;
        let previousLimit = 0;
        const details = [];

        for (let i = 0; i < INSS_TABLE.length; i++) {
            const bracket = INSS_TABLE[i];
            const taxableAmount = Math.min(grossSalary, bracket.limit) - previousLimit;

            if (taxableAmount > 0) {
                const bracketINSS = taxableAmount * bracket.rate;
                inss += bracketINSS;

                details.push({
                    range: `${App.formatCurrency(previousLimit)} até ${App.formatCurrency(bracket.limit)}`,
                    rate: `${(bracket.rate * 100).toFixed(1)}%`,
                    base: App.formatCurrency(taxableAmount),
                    value: App.formatCurrency(bracketINSS)
                });
            }

            previousLimit = bracket.limit;
            if (grossSalary <= bracket.limit) break;
        }

        return { total: inss, details };
    };

    // Calculate IRRF
    const calculateIRRF = (taxBase) => {
        if (taxBase <= 0) return { total: 0, bracket: null, simplified: 0 };

        // Find applicable bracket
        let bracket = null;
        for (let i = 0; i < IRRF_TABLE.length; i++) {
            if (taxBase <= IRRF_TABLE[i].limit) {
                bracket = IRRF_TABLE[i];
                break;
            }
        }

        const normalIR = Math.max(0, (taxBase * bracket.rate) - bracket.deduction);
        const simplifiedIR = Math.max(0, taxBase - SIMPLIFIED_DEDUCTION) * bracket.rate;

        const useSimplified = simplifiedIR < normalIR;
        const total = useSimplified ? simplifiedIR : normalIR;

        return {
            total: Math.max(0, total),
            bracket,
            simplified: useSimplified ? SIMPLIFIED_DEDUCTION : 0,
            normalIR,
            simplifiedIR
        };
    };

    // Main calculation
    const calculate = () => {
        // Parse inputs
        const grossSalary = App.parseCurrency(elGrossSalary.value);
        const dependents = parseInt(elDependents.value) || 0;
        const otherDiscounts = App.parseCurrency(elOtherDiscounts.value);
        const transportValue = elTransportVoucher.checked ? App.parseCurrency(elTransportValue.value) : 0;

        // Validate
        if (grossSalary <= 0) {
            elResGross.textContent = 'R$ 0,00';
            elResINSS.textContent = 'R$ 0,00';
            elResIRRF.textContent = 'R$ 0,00';
            elResOthers.textContent = 'R$ 0,00';
            elResNet.textContent = 'R$ 0,00';
            elINSSDetails.innerHTML = '';
            elIRDetails.innerHTML = '';
            elTableBody.innerHTML = '';
            evolutionTable.style.display = 'none';
            return;
        }

        // Calculate INSS
        const inss = calculateINSS(grossSalary);

        // Calculate IR base
        const dependentDeduction = dependents * DEPENDENT_DEDUCTION;
        const irBase = grossSalary - inss.total - dependentDeduction;

        // Calculate IRRF
        const irrf = calculateIRRF(irBase);

        // Total discounts
        const totalDiscounts = inss.total + irrf.total + otherDiscounts + transportValue;

        // Net salary
        const netSalary = grossSalary - totalDiscounts;

        // Update results
        elResGross.textContent = App.formatCurrency(grossSalary);
        elResINSS.textContent = App.formatCurrency(inss.total);
        elResIRRF.textContent = App.formatCurrency(irrf.total);
        elResOthers.textContent = App.formatCurrency(otherDiscounts + transportValue);
        elResNet.textContent = App.formatCurrency(netSalary);

        // INSS Details
        let inssHTML = '<h6 class="mb-2">Detalhamento INSS (Progressivo)</h6>';
        inssHTML += '<div class="table-responsive"><table class="table table-sm table-bordered">';
        inssHTML += '<thead><tr><th>Faixa</th><th>Alíquota</th><th>Base</th><th>Valor</th></tr></thead><tbody>';
        inss.details.forEach(d => {
            inssHTML += `<tr><td>${d.range}</td><td>${d.rate}</td><td>${d.base}</td><td>${d.value}</td></tr>`;
        });
        inssHTML += '</tbody></table></div>';
        elINSSDetails.innerHTML = inssHTML;

        // IR Details
        let irHTML = '<h6 class="mb-2">Detalhamento IRRF</h6>';
        irHTML += '<div class="small">';
        irHTML += `<div class="mb-1"><strong>Base de cálculo:</strong> ${App.formatCurrency(irBase)}</div>`;
        irHTML += `<div class="mb-1">Salário bruto: ${App.formatCurrency(grossSalary)}</div>`;
        irHTML += `<div class="mb-1">(-) INSS: ${App.formatCurrency(inss.total)}</div>`;
        if (dependents > 0) {
            irHTML += `<div class="mb-1">(-) Dependentes (${dependents} × R$ 189,59): ${App.formatCurrency(dependentDeduction)}</div>`;
        }
        if (irrf.simplified > 0) {
            irHTML += `<div class="mb-1 text-success">✓ Desconto simplificado aplicado: ${App.formatCurrency(irrf.simplified)}</div>`;
        }
        if (irrf.bracket) {
            irHTML += `<div class="mt-2"><strong>Alíquota:</strong> ${(irrf.bracket.rate * 100).toFixed(1)}%</div>`;
            if (irrf.bracket.deduction > 0) {
                irHTML += `<div><strong>Parcela a deduzir:</strong> ${App.formatCurrency(irrf.bracket.deduction)}</div>`;
            }
        }
        irHTML += '</div>';
        elIRDetails.innerHTML = irHTML;

        // Annual table
        buildAnnualTable(grossSalary, inss.total, irrf.total, otherDiscounts + transportValue, netSalary);

        evolutionTable.style.display = 'block';

        // Update URL
        Share.updateURL({
            g: grossSalary,
            d: dependents,
            o: otherDiscounts,
            t: transportValue
        });
    };

    // Build annual projection table
    const buildAnnualTable = (gross, inss, irrf, others, net) => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        let html = '';
        window.simulationData = [];

        months.forEach((month, i) => {
            window.simulationData.push([
                month,
                App.formatCurrency(gross),
                App.formatCurrency(inss),
                App.formatCurrency(irrf),
                App.formatCurrency(others),
                App.formatCurrency(net)
            ]);

            html += `<tr>
                <td>${month}</td>
                <td>${App.formatCurrency(gross)}</td>
                <td>${App.formatCurrency(inss)}</td>
                <td>${App.formatCurrency(irrf)}</td>
                <td>${App.formatCurrency(others)}</td>
                <td class="fw-bold">${App.formatCurrency(net)}</td>
            </tr>`;
        });

        // Totals
        html += `<tr class="table-active fw-bold">
            <td>TOTAL ANUAL</td>
            <td>${App.formatCurrency(gross * 12)}</td>
            <td>${App.formatCurrency(inss * 12)}</td>
            <td>${App.formatCurrency(irrf * 12)}</td>
            <td>${App.formatCurrency(others * 12)}</td>
            <td>${App.formatCurrency(net * 12)}</td>
        </tr>`;

        elTableBody.innerHTML = html;
    };

    // Load state from URL
    const loadState = () => {
        const params = Share.loadFromURL();
        if (params && params.g) elGrossSalary.value = App.formatCurrency(parseFloat(params.g));
        if (params && params.d) elDependents.value = params.d;
        if (params && params.o) elOtherDiscounts.value = App.formatCurrency(parseFloat(params.o));
        if (params && params.t) {
            elTransportVoucher.checked = true;
            elTransportValue.disabled = false;
            elTransportValue.value = App.formatCurrency(parseFloat(params.t));
        }

        if (params && params.g) calculate();
    };

    // Reset
    resetBtn.addEventListener('click', () => {
        elGrossSalary.value = '';
        elDependents.value = '0';
        elOtherDiscounts.value = '';
        elTransportVoucher.checked = false;
        elTransportValue.value = '';
        elTransportValue.disabled = true;

        elResGross.textContent = 'R$ 0,00';
        elResINSS.textContent = 'R$ 0,00';
        elResIRRF.textContent = 'R$ 0,00';
        elResOthers.textContent = 'R$ 0,00';
        elResNet.textContent = 'R$ 0,00';

        elINSSDetails.innerHTML = '';
        elIRDetails.innerHTML = '';
        elTableBody.innerHTML = '';
        evolutionTable.style.display = 'none';

        Share.updateURL({});
    });

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    // Share button
    shareBtn.addEventListener('click', () => {
        Share.copyLink();
    });

    // Export Logic
    const getFileName = (ext) => {
        const now = new Date();
        const dateStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + '-' +
            String(now.getMinutes()).padStart(2, '0');
        const hash = Math.random().toString(36).substring(2, 7);
        return `Relatorio_Salario_Liquido_${dateStr}_${hash}.${ext}`;
    };

    const exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 1. Title
        doc.setFontSize(16);
        doc.text("Relatório de Salário Líquido - CalculaHub", 14, 20);

        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 14, 26);

        // 2. Input Parameters & Results Summary
        doc.setFontSize(11);
        doc.text("Resumo do Cálculo:", 14, 35);

        doc.setFontSize(10);

        // Inputs
        const gross = elGrossSalary.value;
        const dep = elDependents.value;
        const others = elOtherDiscounts.value || 'R$ 0,00';
        const vt = elTransportVoucher.checked ? elTransportValue.value : 'N/A';

        // Results
        const resINSS = elResINSS.textContent;
        const resIRRF = elResIRRF.textContent;
        const resNet = elResNet.textContent;

        // Column 1 - Inputs
        doc.text(`Salário Bruto: ${gross}`, 14, 42);
        doc.text(`Dependentes: ${dep}`, 14, 48);
        doc.text(`Vale-Transporte: ${vt}`, 14, 54);
        doc.text(`Outros Descontos: ${others}`, 14, 60);

        // Column 2 - Results
        doc.text(`Desconto INSS: ${resINSS}`, 100, 42);
        doc.text(`Desconto IRRF: ${resIRRF}`, 100, 48);
        doc.setFont(undefined, 'bold');
        doc.text(`Salário Líquido Final: ${resNet}`, 100, 54);
        doc.setFont(undefined, 'normal');

        // 3. Data Table (Annual Projection)
        doc.autoTable({
            head: [['Mês', 'Bruto', 'INSS', 'IRRF', 'Outros', 'Líquido']],
            body: window.simulationData || [],
            startY: 75,
            theme: 'striped',
            headStyles: { fillColor: [50, 31, 219] },
            styles: { fontSize: 8 },
            didDrawPage: (data) => {
                App.addPdfDisclaimer(doc);
            }
        });

        doc.save(getFileName('pdf'));
    };

    // Attach Listeners
    document.querySelectorAll('.js-export-pdf').forEach(btn => {
        btn.addEventListener('click', exportPDF);
    });

    // Load initial state
    loadState();
});
