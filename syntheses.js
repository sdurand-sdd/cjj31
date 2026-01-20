// ========================================
// MODULE SYNTHÈSES ET EXPORTS (VERSION CORRIGÉE)
// Fichier complémentaire pour 4eme5.html
// ========================================

// Variables globales pour les synthèses
let synthesisData = {
    today: {},
    week: {},
    custom: {},
    total: {}
};

let currentCharts = {
    week: null,
    custom: null,
    total: null
};

// ========================================
// HELPERS POUR ACCÉDER AUX DONNÉES
// ========================================

function getStudents() {
    return window.students || [];
}

function getCurrentStudentId() {
    return window.currentStudentId;
}

function getClassItems() {
    return window.classItems || [];
}

function getSlots() {
    return window.slots || ['M1', 'M2', 'M3', 'M4', 'S0', 'S1', 'S2', 'S3'];
}

function getDays() {
    return window.days || ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
}

function getDb() {
    return window.db;
}

function getClassId() {
    return window.CLASS_ID || '4eme5';
}

function getSchoolYearStart() {
    return window.SCHOOL_YEAR_START || '2024-09-01';
}

// Fonction pour récupérer tous les items (classe + spécifiques)
function getAllItems() {
    const students = getStudents();
    const currentId = getCurrentStudentId();
    const classItems = getClassItems();
    
    const student = students.find(st => st.id === currentId);
    if (!student) return classItems;
    
    return [...classItems, ...(student.specificItems || [])];
}

// ========================================
// NAVIGATION VERS LA VUE SYNTHÈSES
// ========================================

function openSynthesesView() {
    // Masquer la vue de suivi
    document.getElementById('studentTrackingView').classList.remove('active');
    
    // Afficher la vue synthèses
    document.getElementById('synthesisView').classList.add('active');
    
    // Mettre à jour le nom de l'élève
    const students = getStudents();
    const currentId = getCurrentStudentId();
    const student = students.find(s => s.id === currentId);
    
    if (student) {
        document.getElementById('synthesisStudentNameText').textContent = student.name;
    }
    
    // Charger toutes les synthèses
    loadAllSyntheses();
}

function backToTracking() {
    // Masquer la vue synthèses
    document.getElementById('synthesisView').classList.remove('active');
    
    // Afficher la vue de suivi
    document.getElementById('studentTrackingView').classList.add('active');
}

// ========================================
// CHARGEMENT DES SYNTHÈSES
// ========================================

async function loadAllSyntheses() {
    // Afficher la date du jour
    const today = new Date();
    document.getElementById('todayDate').textContent = today.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Calculer et afficher synthèse du jour
    await calculateTodaySynthesis();
    
    // Calculer et afficher synthèse de la semaine
    await calculateWeekSynthesis();
    
    // Calculer et afficher cumul total
    await calculateTotalSynthesis();
    
    // Initialiser les dates pour la période personnalisée
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
    document.getElementById('customStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('customEndDate').value = today.toISOString().split('T')[0];
}

// ========================================
// FONCTION POUR RÉCUPÉRER LES DONNÉES DE TRACKING
// ========================================

async function getTrackingData() {
    try {
        const db = getDb();
        const classId = getClassId();
        const studentId = getCurrentStudentId();
        
        if (!db || !classId || !studentId) {
            console.error('Données manquantes:', { db, classId, studentId });
            return {};
        }
        
        // Import dynamique de Firestore
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
        
        const trackingRef = doc(db, 'tracking', `${classId}_${studentId}`);
        const docSnap = await getDoc(trackingRef);
        
        return docSnap.exists() ? docSnap.data() : {};
    } catch (e) {
        console.error('Erreur getTrackingData:', e);
        return {};
    }
}

// ========================================
// CALCUL SYNTHÈSE DU JOUR
// ========================================

async function calculateTodaySynthesis() {
    const allItems = getAllItems();
    const data = await getTrackingData();
    const today = new Date();
    const weekKey = getWeekKeyForDate(today);
    const dayName = getDayName(today);
    
    const totals = {};
    allItems.forEach(item => totals[item.id] = 0);
    
    const students = getStudents();
    const currentId = getCurrentStudentId();
    const student = students.find(s => s.id === currentId);
    
    if (!student) {
        displaySynthesisStats('todayStats', totals, allItems);
        return;
    }
    
    const weekType = getWeekType(getWeekNumber(today));
    const schedule = weekType === 'A' ? student.scheduleA : student.scheduleB;
    
    if (!schedule) {
        displaySynthesisStats('todayStats', totals, allItems);
        return;
    }
    
    const slots = getSlots();
    
    // Parcourir tous les créneaux du jour
    slots.forEach(slot => {
        const key = `${dayName}-${slot}`;
        if (schedule[key]) {
            allItems.forEach(item => {
                const trackKey = `${weekKey}-${key}-${item.id}`;
                totals[item.id] += data[trackKey] || 0;
            });
        }
    });
    
    // Sauvegarder les données
    synthesisData.today = totals;
    
    // Afficher
    displaySynthesisStats('todayStats', totals, allItems);
}

// ========================================
// CALCUL SYNTHÈSE DE LA SEMAINE
// ========================================

async function calculateWeekSynthesis() {
    const allItems = getAllItems();
    const data = await getTrackingData();
    const today = new Date();
    const weekKey = getWeekKeyForDate(today);
    
    // Afficher la période
    const weekDates = getWeekDateRangeForDate(today);
    document.getElementById('weekPeriod').textContent = weekDates;
    
    const totals = {};
    allItems.forEach(item => totals[item.id] = 0);
    
    const students = getStudents();
    const currentId = getCurrentStudentId();
    const student = students.find(s => s.id === currentId);
    
    if (!student) {
        displaySynthesisStats('weekSynthesisStats', totals, allItems);
        return;
    }
    
    const weekType = getWeekType(getWeekNumber(today));
    const schedule = weekType === 'A' ? student.scheduleA : student.scheduleB;
    
    if (!schedule) {
        displaySynthesisStats('weekSynthesisStats', totals, allItems);
        return;
    }
    
    const days = getDays();
    const slots = getSlots();
    
    // Parcourir tous les jours et créneaux de la semaine
    days.forEach(day => {
        slots.forEach(slot => {
            const key = `${day}-${slot}`;
            if (schedule[key]) {
                allItems.forEach(item => {
                    const trackKey = `${weekKey}-${key}-${item.id}`;
                    totals[item.id] += data[trackKey] || 0;
                });
            }
        });
    });
    
    // Sauvegarder les données
    synthesisData.week = totals;
    
    // Afficher
    displaySynthesisStats('weekSynthesisStats', totals, allItems);
    
    // Créer le graphique
    createChart('weekChart', totals, allItems, 'week');
}

// ========================================
// CALCUL PÉRIODE PERSONNALISÉE
// ========================================

async function calculateCustomPeriod() {
    const startDateStr = document.getElementById('customStartDate').value;
    const endDateStr = document.getElementById('customEndDate').value;
    
    if (!startDateStr || !endDateStr) {
        alert('Veuillez sélectionner les deux dates');
        return;
    }
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (startDate > endDate) {
        alert('La date de début doit être avant la date de fin');
        return;
    }
    
    const allItems = getAllItems();
    const data = await getTrackingData();
    const totals = {};
    allItems.forEach(item => totals[item.id] = 0);
    
    const students = getStudents();
    const currentId = getCurrentStudentId();
    const student = students.find(s => s.id === currentId);
    
    if (!student) {
        displaySynthesisStats('customStats', totals, allItems);
        return;
    }
    
    const slots = getSlots();
    
    // Parcourir chaque jour de la période
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const weekKey = getWeekKeyForDate(currentDate);
        const dayName = getDayName(currentDate);
        const weekType = getWeekType(getWeekNumber(currentDate));
        const schedule = weekType === 'A' ? student.scheduleA : student.scheduleB;
        
        if (schedule) {
            slots.forEach(slot => {
                const key = `${dayName}-${slot}`;
                if (schedule[key]) {
                    allItems.forEach(item => {
                        const trackKey = `${weekKey}-${key}-${item.id}`;
                        totals[item.id] += data[trackKey] || 0;
                    });
                }
            });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Sauvegarder les données
    synthesisData.custom = totals;
    synthesisData.customPeriod = `Du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`;
    
    // Afficher
    displaySynthesisStats('customStats', totals, allItems);
    
    // Créer le graphique
    document.getElementById('customChartContainer').style.display = 'block';
    createChart('customChart', totals, allItems, 'custom');
    
    // Afficher les boutons d'export
    document.getElementById('customExportButtons').style.display = 'flex';
}

// ========================================
// CALCUL CUMUL TOTAL
// ========================================

async function calculateTotalSynthesis() {
    const allItems = getAllItems();
    const data = await getTrackingData();
    
    const totals = {};
    allItems.forEach(item => totals[item.id] = 0);
    
    // Parcourir toutes les données de tracking
    Object.keys(data).forEach(trackKey => {
        // Format: "2025-W03-Lundi-M1-itemId"
        const parts = trackKey.split('-');
        if (parts.length >= 5) {
            const itemId = parts.slice(4).join('-'); // Au cas où l'ID contient des tirets
            if (totals.hasOwnProperty(itemId)) {
                totals[itemId] += data[trackKey];
            }
        }
    });
    
    // Afficher la période
    const startDateStr = getSchoolYearStart();
    const today = new Date();
    document.getElementById('totalPeriod').textContent = 
        `Du ${new Date(startDateStr).toLocaleDateString('fr-FR')} au ${today.toLocaleDateString('fr-FR')}`;
    
    // Sauvegarder les données
    synthesisData.total = totals;
    
    // Afficher
    displaySynthesisStats('totalStats', totals, allItems);
    
    // Créer le graphique
    createChart('totalChart', totals, allItems, 'total');
}

// ========================================
// AFFICHAGE DES STATISTIQUES
// ========================================

function displaySynthesisStats(containerId, totals, allItems) {
    const container = document.getElementById(containerId);
    
    if (allItems.length === 0) {
        container.innerHTML = `
            <div class="empty-synthesis">
                <div class="empty-synthesis-icon">📊</div>
                <p>Aucun item configuré</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allItems.map(item => {
        const value = totals[item.id] || 0;
        const cssClass = value > 0 ? 'positive' : (value < 0 ? 'negative' : '');
        
        return `
            <div class="synthesis-stat-card ${cssClass}">
                <div class="synthesis-stat-label">${item.emoji} ${item.name}</div>
                <div class="synthesis-stat-value ${cssClass}">
                    ${value > 0 ? '+' : ''}${value}
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// CRÉATION DES GRAPHIQUES
// ========================================

function createChart(canvasId, totals, allItems, chartType) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Détruire le graphique existant si présent
    if (currentCharts[chartType]) {
        currentCharts[chartType].destroy();
    }
    
    const labels = allItems.map(item => `${item.emoji} ${item.name}`);
    const data = allItems.map(item => totals[item.id] || 0);
    const backgroundColors = data.map(value => 
        value > 0 ? 'rgba(40, 167, 69, 0.6)' : 
        value < 0 ? 'rgba(220, 53, 69, 0.6)' : 
        'rgba(108, 117, 125, 0.6)'
    );
    const borderColors = data.map(value => 
        value > 0 ? 'rgba(40, 167, 69, 1)' : 
        value < 0 ? 'rgba(220, 53, 69, 1)' : 
        'rgba(108, 117, 125, 1)'
    );
    
    currentCharts[chartType] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Répartition par item',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

// ========================================
// EXPORT CSV
// ========================================

function exportCSV(type) {
    const students = getStudents();
    const currentId = getCurrentStudentId();
    const student = students.find(s => s.id === currentId);
    if (!student) return;
    
    const allItems = getAllItems();
    let totals, period, filename;
    
    switch(type) {
        case 'today':
            totals = synthesisData.today;
            period = document.getElementById('todayDate').textContent;
            filename = `synthese_jour_${student.name}_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'week':
            totals = synthesisData.week;
            period = document.getElementById('weekPeriod').textContent;
            filename = `synthese_semaine_${student.name}_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'custom':
            totals = synthesisData.custom;
            period = synthesisData.customPeriod || 'Période personnalisée';
            filename = `synthese_periode_${student.name}_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'total':
            totals = synthesisData.total;
            period = document.getElementById('totalPeriod').textContent;
            filename = `synthese_totale_${student.name}_${new Date().toISOString().split('T')[0]}.csv`;
            break;
    }
    
    // Créer le contenu CSV
    let csv = 'Item,Total\n';
    allItems.forEach(item => {
        const value = totals[item.id] || 0;
        csv += `"${item.name}",${value}\n`;
    });
    
    // Ajouter les métadonnées
    csv += `\nÉlève,"${student.name}"\n`;
    csv += `Période,"${period}"\n`;
    csv += `Date d'export,"${new Date().toLocaleDateString('fr-FR')}"\n`;
    
    // Télécharger
    downloadFile(csv, filename, 'text/csv');
}

// ========================================
// EXPORT PDF
// ========================================

async function exportPDF(type) {
    const students = getStudents();
    const currentId = getCurrentStudentId();
    const student = students.find(s => s.id === currentId);
    if (!student) return;
    
    const allItems = getAllItems();
    let totals, period, title;
    
    switch(type) {
        case 'today':
            totals = synthesisData.today;
            period = document.getElementById('todayDate').textContent;
            title = 'Synthèse du jour';
            break;
        case 'week':
            totals = synthesisData.week;
            period = document.getElementById('weekPeriod').textContent;
            title = 'Synthèse de la semaine';
            break;
        case 'custom':
            totals = synthesisData.custom;
            period = synthesisData.customPeriod || 'Période personnalisée';
            title = 'Synthèse sur période personnalisée';
            break;
        case 'total':
            totals = synthesisData.total;
            period = document.getElementById('totalPeriod').textContent;
            title = 'Cumul total';
            break;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text(title, 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(student.name, 105, 35, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(period, 105, 45, { align: 'center' });
    
    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 50, 190, 50);
    
    // Tableau des résultats
    let y = 65;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Résultats par item', 20, y);
    
    y += 10;
    doc.setFontSize(11);
    
    // En-tête du tableau
    doc.setFillColor(102, 126, 234);
    doc.setTextColor(255, 255, 255);
    doc.rect(20, y, 170, 10, 'F');
    doc.text('Item', 25, y + 7);
    doc.text('Total', 160, y + 7);
    
    y += 10;
    doc.setTextColor(0, 0, 0);
    
    // Lignes du tableau
    allItems.forEach((item, index) => {
        const value = totals[item.id] || 0;
        
        // Couleur de fond alternée
        if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250);
            doc.rect(20, y, 170, 10, 'F');
        }
        
        // Couleur du texte selon la valeur
        if (value > 0) {
            doc.setTextColor(40, 167, 69);
        } else if (value < 0) {
            doc.setTextColor(220, 53, 69);
        } else {
            doc.setTextColor(0, 0, 0);
        }
        
        doc.text(`${item.name}`, 25, y + 7);
        doc.text(`${value > 0 ? '+' : ''}${value}`, 160, y + 7);
        
        y += 10;
        
        // Nouvelle page si nécessaire
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
    });
    
    // Pied de page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i}/${pageCount}`,
            105,
            290,
            { align: 'center' }
        );
    }
    
    // Télécharger
    const filename = `synthese_${type}_${student.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getWeekKeyForDate(date) {
    // Calculer currentWeek depuis aujourd'hui
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekOffset = Math.floor(diffDays / 7);
    
    // Obtenir le type de semaine (A ou B)
    const weekType = getWeekTypeForDate(date);
    
    return `week_${weekOffset}_${weekType}`;
}

function getWeekTypeForDate(date) {
    const startDate = new Date(getSchoolYearStart());
    const diffTime = Math.abs(date - startDate);
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks % 2 === 0 ? 'A' : 'B';
}

function getDayName(date) {
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return dayNames[date.getDay()];
}

function getWeekDateRangeForDate(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
    return `${monday.toLocaleDateString('fr-FR')} - ${friday.toLocaleDateString('fr-FR')}`;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

function getWeekType(weekNum) {
    return (weekNum % 2 === 0) ? 'B' : 'A';
}

// ========================================
// RENDRE LES FONCTIONS ACCESSIBLES
// ========================================

window.openSynthesesView = openSynthesesView;
window.backToTracking = backToTracking;
window.calculateCustomPeriod = calculateCustomPeriod;
window.exportPDF = exportPDF;
window.exportCSV = exportCSV;
