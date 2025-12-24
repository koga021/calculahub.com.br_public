// Calculadora de Rescisão Trabalhista - CalculaHub
// Atualizado para Tabelas 2024/2025

document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const elGross = document.getElementById('grossSalary');
    const elDep = document.getElementById('dependents');
    const elAdm = document.getElementById('admissionDate');
    const elDis = document.getElementById('dismissalDate');
    const elType = document.getElementById('rescissionType');
    const elNotice = document.getElementById('noticeType');
    const elLastWorked = document.getElementById('lastDayWorked');
    const elPendingVacationStatus = document.getElementById('pendingVacation');
    const elInclude13 = document.getElementById('include13Prop');
    const elIncludeVac = document.getElementById('includeVacProp');
    const elIncludeMulta = document.getElementById('includeFGTSMulta');

    const competenceDate = () => {
        const dDis = new Date(elDis.value + 'T00:00:00');
        if (isNaN(dDis.getTime())) return "";
        return `${String(dDis.getMonth() + 1).padStart(2, '0')}/${dDis.getFullYear()}`;
    };

    const form = document.getElementById('calcForm');
    const resetBtn = document.getElementById('resetBtn');
    const resultsArea = document.getElementById('resultsArea');
    const tableBody = document.getElementById('resTableBody');
    const resTypeBadge = document.getElementById('resTypeBadge');

    // Summaries
    const resTotalProventos = document.getElementById('resTotalProventos');
    const resTotalDescontos = document.getElementById('resTotalDescontos');
    const resNetTotal = document.getElementById('resNetTotal');
    const resFgtsMulta = document.getElementById('resFgtsMulta');

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

    const SIMPLIFIED_DEDUCTION = 528.00;
    const DEPENDENT_DEDUCTION = 189.59;

    // Apply money mask
    if (typeof App !== 'undefined' && App.applyMoneyMask) {
        App.applyMoneyMask();
    }

    // Helpers
    const calculateINSS = (value) => {
        let inss = 0;
        let prev = 0;
        for (let b of INSS_TABLE) {
            const taxable = Math.min(value, b.limit) - prev;
            if (taxable > 0) inss += taxable * b.rate;
            prev = b.limit;
            if (value <= b.limit) break;
        }
        return inss;
    };

    const applyIRRFTable = (base) => {
        if (base <= 0) return 0;
        let b = IRRF_TABLE.find(x => base <= x.limit) || IRRF_TABLE[IRRF_TABLE.length - 1];
        return Math.max(0, (base * b.rate) - b.deduction);
    };

    const calculateIRRF = (taxableIncome, inss, deps) => {
        const standardBase = taxableIncome - inss - (deps * DEPENDENT_DEDUCTION);
        const simplifiedBase = taxableIncome - SIMPLIFIED_DEDUCTION;

        const standardValue = applyIRRFTable(standardBase);
        const simplifiedValue = applyIRRFTable(simplifiedBase);

        return Math.min(standardValue, simplifiedValue);
    };

    // Main Calc
    const calculate = () => {
        const salary = App.parseCurrency(elGross.value);
        const depCount = parseInt(elDep.value) || 0;
        const dAdm = new Date(elAdm.value + 'T00:00:00');
        const dDis = new Date(elDis.value + 'T00:00:00');
        const rType = elType.value;
        const nType = elNotice.value;

        if (isNaN(dAdm.getTime()) || isNaN(dDis.getTime()) || salary === 0) return;
        if (dDis < dAdm) {
            alert("A data de desligamento não pode ser anterior à admissão.");
            return;
        }

        const proventos = [];
        const descontos = [];


        // 1. Saldo de Salário
        const daysInMonth = new Date(dDis.getFullYear(), dDis.getMonth() + 1, 0).getDate();
        const daysWorked = dDis.getDate();
        const saldoSalario = (salary / 30) * daysWorked;
        proventos.push({ label: `Saldo de Salário (${daysWorked} dias)`, value: saldoSalario });


        // 2. 13º Proporcional
        let treceiro = 0;
        if (elInclude13.checked && rType !== 'com_justa') {
            // Rule: 15 days or more in a month counts as 1/12
            let months13 = dDis.getMonth() + (dDis.getDate() >= 15 ? 1 : 0);
            // If admitted in the same year
            if (dAdm.getFullYear() === dDis.getFullYear()) {
                const startMonth = dAdm.getMonth() + (dAdm.getDate() <= 15 ? 0 : 1);
                months13 = Math.max(0, months13 - startMonth);
            }

            treceiro = (salary / 12) * months13;
            if (treceiro > 0) {
                proventos.push({ label: `13º Proporcional (${months13}/12)`, value: treceiro });
            }
        }

        // 3. Férias (NÃO TRIBUTÁVEIS em rescisão para INSS/IRRF)
        if (rType !== 'com_justa') {
            // Férias Vencidas
            if (elPendingVacationStatus.checked) {
                const feriasVencidas = salary;
                const feriasVencidasTerco = feriasVencidas / 3;
                proventos.push({ label: 'Férias Vencidas', value: feriasVencidas });
                proventos.push({ label: '1/3 Férias Vencidas', value: feriasVencidasTerco });
            }

            // Férias Proporcionais
            if (elIncludeVac.checked) {
                // Check full months of current period
                const years = dDis.getFullYear() - dAdm.getFullYear();
                let monFerias = dDis.getMonth() - dAdm.getMonth() + (years * 12);
                if (dDis.getDate() - dAdm.getDate() < 0) monFerias--;

                // Days leftover for 15-day rule
                const lastAnniversary = new Date(dAdm);
                lastAnniversary.setFullYear(dAdm.getFullYear() + Math.floor(monFerias / 12));
                lastAnniversary.setMonth(dAdm.getMonth() + (monFerias % 12));

                const diffDays = Math.floor((dDis - lastAnniversary) / (1000 * 60 * 60 * 24));
                if (diffDays >= 15) monFerias++;

                const avosFerias = monFerias % 12;
                const feriasProp = (salary / 12) * avosFerias;
                const feriasPropTerco = feriasProp / 3;
                if (feriasProp > 0) {
                    proventos.push({ label: `Férias Proporcionais (${avosFerias}/12)`, value: feriasProp });
                    proventos.push({ label: '1/3 Férias Proporcionais', value: feriasPropTerco });
                }
            }
        }

        // 4. Aviso Prévio
        let avisoValue = 0;
        if (nType === 'indenizado') {
            if (rType === 'sem_justa' || rType === 'acordo') {
                const yearsWorkedTotal = Math.floor((dDis - dAdm) / (1000 * 60 * 60 * 24 * 365));
                const daysAviso = Math.min(90, 30 + (yearsWorkedTotal * 3));
                const factor = rType === 'acordo' ? 0.5 : 1.0;
                avisoValue = (salary / 30) * daysAviso * factor;
                proventos.push({ label: `Aviso Prévio Indenizado (${daysAviso} dias${rType === 'acordo' ? ' x 50%' : ''})`, value: avisoValue });
                // Aviso Indenizado NÃO tributa INSS/IRRF na maioria das interpretações esocial (rescisão)
            }
        } else if (nType === 'trabalhado') {
            // Se foi trabalhado, geralmente o aviso termina na data de desligamento.
            // O saldo de salário já cobre os dias do mês. 
            // Se o aviso engloba dias de meses anteriores, supõe-se que já foram pagos.
            // Aqui garantimos que o saldo de salário seja considerado tributável.
            // (Já foi adicionado acima)
        } else if (nType === 'nao_cumprido') {
            if (rType === 'pedido' || rType === 'acordo') {
                const factor = rType === 'acordo' ? 0.5 : 1.0;
                const descAviso = salary * factor;
                descontos.push({ label: `Desconto Aviso Prévio${rType === 'acordo' ? ' (50%)' : ''}`, value: descAviso });
            }
        }

        // 5. Consolidated Taxes (INSS and IRRF)
        // Group taxable bases: Saldo Salário + 13º + Aviso (Worked or Indentified)
        const totalTributavel = saldoSalario + treceiro + avisoValue;
        const compStr = competenceDate();

        if (totalTributavel > 0) {
            const totalINSS = calculateINSS(totalTributavel);
            if (totalINSS > 0) {
                descontos.push({ label: `INSS (Competência ${compStr})`, value: totalINSS });
            }

            const totalIRRF = calculateIRRF(totalTributavel, totalINSS, depCount);
            if (totalIRRF > 0) {
                descontos.push({ label: `IRRF (Competência ${compStr})`, value: totalIRRF });
            }
        }

        // 7. FGTS / Multa (Informativo)
        const totalMonthsWorked = Math.floor((dDis - dAdm) / (1000 * 60 * 60 * 24 * 30));
        const estimatedFGTSBalance = salary * 0.08 * Math.max(1, totalMonthsWorked);
        let multa = 0;

        if (elIncludeMulta.checked) {
            if (rType === 'sem_justa') {
                multa = estimatedFGTSBalance * 0.4;
            } else if (rType === 'acordo') {
                multa = estimatedFGTSBalance * 0.2;
            }
        }
        resFgtsMulta.textContent = App.formatCurrency(multa);

        // Render Table
        tableBody.innerHTML = '';
        let sumP = 0;
        let sumD = 0;

        const allItems = [...proventos.map(p => ({ ...p, type: 'P' })), ...descontos.map(d => ({ ...d, type: 'D' }))];

        allItems.forEach(item => {
            const tr = document.createElement('tr');
            if (item.type === 'P') {
                sumP += item.value;
                tr.innerHTML = `<td>${item.label}</td><td class="text-end text-success">${App.formatCurrency(item.value)}</td><td class="text-end">-</td>`;
            } else {
                sumD += item.value;
                tr.innerHTML = `<td>${item.label}</td><td class="text-end">-</td><td class="text-end text-danger">${App.formatCurrency(item.value)}</td>`;
            }
            tableBody.appendChild(tr);
        });

        const net = sumP - sumD;
        resTotalProventos.textContent = App.formatCurrency(sumP);
        resTotalDescontos.textContent = App.formatCurrency(sumD);
        resNetTotal.textContent = App.formatCurrency(net);
        resTypeBadge.textContent = elType.options[elType.selectedIndex].text;

        resultsArea.style.display = 'block';
        resultsArea.scrollIntoView({ behavior: 'smooth' });

        // Update URL for sharing
        Share.updateURL({
            g: salary,
            d: depCount,
            ad: elAdm.value,
            dd: elDis.value,
            rt: rType,
            nt: nType,
            lw: elLastWorked.checked,
            pv: elPendingVacationStatus.checked,
            i13: elInclude13.checked,
            iv: elIncludeVac.checked,
            im: elIncludeMulta.checked
        });

        // State for Exports
        window.simulationData = allItems.map(i => [i.label, i.type === 'P' ? App.formatCurrency(i.value) : '-', i.type === 'D' ? App.formatCurrency(i.value) : '-']);
        window.resSummary = { net, proventos: sumP, descontos: sumD, multa, type: elType.options[elType.selectedIndex].text };
    };

    // Load state from URL
    const loadState = () => {
        const params = Share.loadFromURL();
        if (params) {
            if (params.g) elGross.value = App.formatCurrency(parseFloat(params.g));
            if (params.d) elDep.value = params.d;
            if (params.ad) elAdm.value = params.ad;
            if (params.dd) elDis.value = params.dd;
            if (params.rt) elType.value = params.rt;
            if (params.nt) elNotice.value = params.nt;
            if (params.lw !== undefined) elLastWorked.checked = params.lw === true || params.lw === 'true';
            if (params.pv !== undefined) elPendingVacationStatus.checked = params.pv === true || params.pv === 'true';
            if (params.i13 !== undefined) elInclude13.checked = params.i13 === true || params.i13 === 'true';
            if (params.iv !== undefined) elIncludeVac.checked = params.iv === true || params.iv === 'true';
            if (params.im !== undefined) elIncludeMulta.checked = params.im === true || params.im === 'true';

            if (params.g && params.ad && params.dd) {
                calculate();
            }
        }
    };

    // Events
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });

    resetBtn.addEventListener('click', () => {
        resultsArea.style.display = 'none';
        Share.updateURL({});
        window.scrollTo(0, 0);
    });

    if (typeof App !== 'undefined') {
        App.initUI();
    }

    // PDF 
    const exportPDF = () => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            if (!window.resSummary || !window.simulationData) {
                alert("Por favor, realize o cálculo antes de exportar.");
                return;
            }

            doc.setFontSize(16);
            doc.text("Simulação de Rescisão Trabalhista - CalculaHub", 14, 20);

            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);
            doc.text(`Tipo de Rescisão: ${window.resSummary.type}`, 14, 34);

            doc.autoTable({
                head: [['Verba/Desconto', 'Proventos (+)', 'Descontos (-)']],
                body: window.simulationData,
                startY: 45,
                theme: 'striped',
                headStyles: { fillColor: [50, 31, 219] },
                didDrawPage: (data) => {
                    App.addPdfDisclaimer(doc);
                }
            });

            const finalY = doc.lastAutoTable.finalY || 45;
            doc.setFont(undefined, 'bold');
            doc.text(`Total Proventos: ${App.formatCurrency(window.resSummary.proventos)}`, 110, finalY + 10);
            doc.text(`Total Descontos: ${App.formatCurrency(window.resSummary.descontos)}`, 110, finalY + 16);
            doc.setFontSize(14);
            doc.setTextColor(50, 31, 219);
            doc.text(`LÍQUIDO ESTIMADO: ${App.formatCurrency(window.resSummary.net)}`, 110, finalY + 26);

            const fileName = `CalculaHub_Rescisao_${new Date().getTime()}.pdf`;

            // Mobile compatibility fix
            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 100);
            } else {
                doc.save(fileName);
            }
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.");
        }
    };

    document.querySelectorAll('.js-export-pdf').forEach(btn => btn.addEventListener('click', exportPDF));

    const shareBtnInternal = document.getElementById('shareBtn');
    if (shareBtnInternal) {
        shareBtnInternal.addEventListener('click', () => Share.copyLink());
    }

    // Load initial state
    loadState();
});
