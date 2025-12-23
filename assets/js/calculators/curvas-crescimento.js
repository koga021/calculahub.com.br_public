/**
 * WHO Child Growth Calculator Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    // Elements
    const form = document.getElementById('calcForm');
    const resetBtn = document.getElementById('resetBtn');

    // Inputs
    const elSexM = document.getElementById('sexM');
    // sexF is handled by name="sex"
    const elDob = document.getElementById('dob');
    const elMeasureDate = document.getElementById('measureDate');
    const elWeight = document.getElementById('weight');
    const elLength = document.getElementById('length');
    const elHead = document.getElementById('head');

    const elIsPremature = document.getElementById('isPremature');
    const elPrematureFields = document.getElementById('prematureFields');
    const elGestationalWeeks = document.getElementById('gestationalWeeks');

    // Results Container
    const elResultContainer = document.getElementById('resultContainer');
    const elPlaceholder = document.getElementById('placeholderState');

    // Result Fields
    const elResAge = document.getElementById('resAge');
    const elResCorrected = document.getElementById('resCorrected');

    // Card Elements
    const cards = {
        wfa: { card: document.getElementById('cardWFA'), z: document.getElementById('zWFA'), badge: document.getElementById('badgeWFA'), desc: document.getElementById('descWFA') },
        lfa: { card: document.getElementById('cardLFA'), z: document.getElementById('zLFA'), badge: document.getElementById('badgeLFA'), desc: document.getElementById('descLFA') },
        hcfa: { card: document.getElementById('cardHCFA'), z: document.getElementById('zHCFA'), badge: document.getElementById('badgeHCFA'), desc: document.getElementById('descHCFA'), block: document.getElementById('blockHCFA') },
    };

    // Toggle Premature State
    elIsPremature.addEventListener('change', () => {
        if (elIsPremature.checked) {
            elPrematureFields.classList.remove('d-none');
        } else {
            elPrematureFields.classList.add('d-none');
        }
    });



    // Core Calculation Function
    const calculate = (e) => {
        e.preventDefault();

        // 1. Get Inputs
        const sex = elSexM.checked ? 'boys' : 'girls';
        const dob = new Date(elDob.value);
        const measureDate = new Date(elMeasureDate.value);

        let weight = parseFloat(elWeight.value);
        let len = parseFloat(elLength.value);
        let head = parseFloat(elHead.value);

        if (!elDob.value || isNaN(dob.getTime())) {
            alert('Por favor, informe a Data de Nascimento.');
            return;
        }

        // 2. Calculate Age in Days
        const diffTime = measureDate - dob;
        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (totalDays < 0) {
            alert('A Data da Medição não pode ser anterior ao Nascimento.');
            return;
        }

        // 3. Prematurity Correction
        let correctedDays = totalDays;
        let isPremature = elIsPremature.checked;
        let correctionText = '';

        if (isPremature) {
            const weeks = parseFloat(elGestationalWeeks.value);
            if (weeks && weeks < 40) {
                // Formula: Days to subtract = (40 - weeks) * 7
                const daysToSubtract = (40 - weeks) * 7;
                correctedDays = totalDays - daysToSubtract;
                elResCorrected.classList.remove('d-none');

                // Format display: Handle negative days (pre-term)
                if (correctedDays < 0) {
                    // Convert negative days to "weeks until term" approximation or just show raw negative
                    let weeksLeft = Math.ceil(Math.abs(correctedDays) / 7);
                    elResCorrected.textContent = `Idade Corrigida: Pré-termo (Faltam ~${weeksLeft} sem. para 40s)`;
                    elResCorrected.className = 'badge bg-danger text-white'; // Distinctive style
                } else {
                    let cMonths = Math.floor(correctedDays / 30.4375);
                    let cDays = Math.floor(correctedDays % 30.4375);
                    elResCorrected.textContent = `Idade Corrigida: ${cMonths}m ${cDays}d`;
                    elResCorrected.className = 'badge bg-warning text-dark';
                }
            }
        } else {
            elResCorrected.classList.add('d-none');
        }

        // Display Chronological Age
        let dMonths = Math.floor(totalDays / 30.4375);
        let dDays = Math.floor(totalDays % 30.4375);
        elResAge.textContent = `${dMonths} meses e ${dDays} dias`;

        // CRITICAL CHECK: Negative Corrected Age
        // If corrected age is negative, baby is technically "pre-term" relative to WHO standards
        if (correctedDays < 0) {
            // Hide all cards
            Object.values(cards).forEach(c => c.card.classList.add('d-none'));

            // Show special message in placeholder or a new alert
            elPlaceholder.innerHTML = `
                <div class="alert alert-warning text-start">
                    <h4><i class="fas fa-exclamation-triangle"></i> Atenção: Idade Corrigida Pré-termo</h4>
                    <p>A idade corrigida do bebê ainda é negativa, o que significa que ele não atingiu a data correspondente a 40 semanas de gestação.</p>
                    <p>As Curvas da OMS (0-24 meses) aplicam-se apenas a partir do nascimento a termo (Idade Corrigida ≥ 0). Para esta fase, recomenda-se o uso das curvas de <strong>Fenton</strong> ou <strong>Intergrowth-21st</strong>.</p>
                </div>
            `;
            elPlaceholder.classList.remove('d-none');
            elResultContainer.classList.add('d-none');
            return; // STOP CALCULATION
        } else {
            // Reset placeholder if previously set
            elPlaceholder.innerHTML = `
                <i class="fas fa-baby fa-4x mb-3 opacity-25"></i>
                <p>Preencha os dados ao lado para ver a análise.</p>
             `;
        }

        // Use corrected age for LMS lookup
        let calcAgeDays = correctedDays;
        let calcAgeMonths = calcAgeDays / 30.4375;


        // 4. Data Lookup & Z-Score Calc
        // Helper to find L, M, S for a given age (month float)
        // We will perform linear interpolation between the two nearest month points from WHO_DATA

        const getLMS = (dataset, ageMonths) => {
            // dataset is array of [Month, L, M, S]
            // Find lower and upper bounds
            let floorMonth = Math.floor(ageMonths);
            let ceilMonth = Math.ceil(ageMonths);

            // Limit to 24 months as per requested scope
            if (floorMonth >= 24) { floorMonth = 24; ceilMonth = 24; }

            // Get points
            // Assuming dataset is sorted 0..24. 
            // Safety check if index exists
            let lower = dataset[floorMonth];
            let upper = dataset[ceilMonth];

            if (!lower) return null; // Out of bounds
            if (!upper) upper = lower; // Exact match or end of array

            // Interpolate
            // weight = fraction of the month
            let fraction = ageMonths - floorMonth;

            // Linear Interpolation Function
            const lerp = (v0, v1, t) => v0 + t * (v1 - v0);

            let L = lerp(lower[1], upper[1], fraction);
            let M = lerp(lower[2], upper[2], fraction);
            let S = lerp(lower[3], upper[3], fraction);

            return { L, M, S };
        };

        const calculateZ = (measure, lms) => {
            if (!measure || !lms) return null;
            // Z = ((X/M)^L - 1) / (L * S)
            let { L, M, S } = lms;
            let base = Math.pow((measure / M), L);
            let z = (base - 1) / (L * S);
            return z;
        };

        const updateCard = (key, measure, dataset) => {
            if (!measure || isNaN(measure)) {
                cards[key].card.classList.add('d-none'); // Or partial hide? Let's just mute it
                cards[key].z.textContent = '--';
                return;
            }

            cards[key].card.classList.remove('d-none');

            let lms = getLMS(dataset, calcAgeMonths);
            if (!lms) {
                cards[key].z.textContent = 'Fora da faixa (0-24m)';
                return;
            }

            let z = calculateZ(measure, lms);

            // Display Z (2 decimals)
            cards[key].z.textContent = (z > 0 ? '+' : '') + z.toFixed(2);

            // Classification & Styling
            let status = '';
            let colorClass = '';
            let desc = '';

            if (z < -3) {
                status = 'Muito Baixo';
                colorClass = 'bg-danger text-white';
                desc = 'Abaixo de -3 DP (Grave)';
            } else if (z >= -3 && z < -2) {
                status = 'Baixo';
                colorClass = 'bg-warning text-dark';
                desc = 'Entre -3 e -2 DP (Alerta)';
            } else if (z >= -2 && z <= 2) {
                status = 'Adequado';
                colorClass = 'bg-success text-white';
                desc = 'Entre -2 e +2 DP (Ideal)';
            } else if (z > 2 && z <= 3) {
                status = 'Elevado';
                colorClass = 'bg-warning text-dark';
                desc = 'Entre +2 e +3 DP (Atenção)';
            } else {
                status = 'Muito Elevado';
                colorClass = 'bg-danger text-white';
                desc = 'Acima de +3 DP';
            }

            const badge = cards[key].badge;
            badge.className = `badge ${colorClass}`;
            badge.textContent = status;
            cards[key].desc.textContent = desc;

            // Update Card Border Color dynamically
            let borderClass = 'border-start-success';
            if (status.includes('Baixo') || status.includes('Elevado')) borderClass = 'border-start-warning';
            if (status.includes('Muito')) borderClass = 'border-start-danger';
            if (status === 'Adequado') borderClass = 'border-start-success';

            cards[key].card.className = `card border-start-4 shadow-sm ${borderClass}`;
        };


        // Run calculations
        // Retrieve Data from Window (loaded via who-data.js)
        const data = window.WHO_DATA[sex]; // boys or girls

        updateCard('wfa', weight, data.wfa);
        updateCard('lfa', len, data.lfa);
        updateCard('hcfa', head, data.hcfa);

        // Show Results
        elPlaceholder.classList.add('d-none');
        elResultContainer.classList.remove('d-none');
    };


    // Export PDF
    const exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(16);
        doc.text("Relatório de Crescimento Infantil (OMS) - CalculaHub", 14, 20);

        // Inputs Summary
        doc.setFontSize(11);
        doc.text(`Data do Relatório: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Sexo: ${elSexM.checked ? 'Menino' : 'Menina'}`, 14, 38);
        doc.text(`Nascimento: ${new Date(elDob.value).toLocaleDateString()}`, 14, 46);
        doc.text(`Idade na Medição: ${elResAge.textContent}`, 14, 54);
        if (!elResCorrected.classList.contains('d-none')) {
            doc.text(`${elResCorrected.textContent}`, 14, 62);
        }

        // Table
        let rows = [];
        const addToRow = (label, val, unit, z, status) => {
            if (val && !isNaN(val)) rows.push([label, `${val} ${unit}`, z, status]);
        };

        addToRow('Peso', elWeight.value, 'kg', cards.wfa.z.textContent, cards.wfa.badge.textContent);
        addToRow('Comprimento', elLength.value, 'cm', cards.lfa.z.textContent, cards.lfa.badge.textContent);
        addToRow('Perímetro Cefálico', elHead.value, 'cm', cards.hcfa.z.textContent, cards.hcfa.badge.textContent);

        doc.autoTable({
            head: [['Medida', 'Valor', 'Z-Score', 'Classificação']],
            body: rows,
            startY: 75,
            theme: 'striped',
            headStyles: { fillColor: [46, 184, 92] },
            didDrawPage: (data) => {
                App.addPdfDisclaimer(doc);
            }
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(100);
        // Centralized helper already adds it to the bottom of the page
        // App.addPdfDisclaimer(doc); is called via didDrawPage above

        doc.save(`Crescimento_OMS_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // State Management for Share URL
    const updateUrl = () => {
        const state = {
            s: elSexM.checked ? 'm' : 'f',
            d: elDob.value,
            m: elMeasureDate.value,
            w: elWeight.value,
            l: elLength.value,
            h: elHead.value,
            p: document.getElementById('isPremature').checked ? 1 : 0,
            g: document.getElementById('gestationalWeeks').value
        };
        Share.updateURL(state);
    };

    const loadState = () => {
        const state = Share.loadFromURL();
        if (state) {
            if (state.s === 'f') document.getElementById('sexF').checked = true;
            elDob.value = state.d || '';
            elMeasureDate.value = state.m || '';
            elWeight.value = state.w || '';
            elLength.value = state.l || '';
            elHead.value = state.h || '';
            if (state.p) {
                document.getElementById('isPremature').checked = true;
                document.getElementById('prematureFields').classList.remove('d-none');
                document.getElementById('gestationalWeeks').value = state.g || '';
            }
            // Trigger calc if dates present
            if (elDob.value && elMeasureDate.value) {
                // Manually trigger submit
                form.dispatchEvent(new Event('submit'));
            }
        }
    };


    // Reset logic
    resetBtn.addEventListener('click', () => {
        elWeight.value = '';
        elLength.value = '';
        elHead.value = '';
        elDob.value = '';
        elMeasureDate.value = ''; // Clear Measurement Date
        elPlaceholder.classList.remove('d-none');
        elResultContainer.classList.add('d-none');
        Share.clearURL();
    });

    form.addEventListener('submit', (e) => {
        calculate(e);
        updateUrl();
    });

    document.getElementById('shareBtn').addEventListener('click', Share.copyLink);
    document.getElementById('btnExportPDF').addEventListener('click', exportPDF);

    // Init
    loadState();
});
