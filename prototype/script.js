/*
  Bus Link - script.js (shared by every page)

  1. Sounds
  2. appState: the demo data (cards, students, schedules, fleet, ledger)
  3. Saving the data between pages
  4. Helpers
  5. Kiosk, Admin, Conductor, Passenger app, University portal
  6. Popups and toast messages

  Every interface is its own HTML page. A function simply does nothing
  when the page it draws on is not the page that is open.
*/

// ===== Sounds (made with the browser's Web Audio API) =====
let audioCtx = null;

// The browser needs one "audio context" before it can play sounds
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Starts one beep: its wave shape, how loud it starts and ends, how long it lasts, and a delay
function startSound(shape, volume, endVolume, seconds, delay) {
    const ctx = getAudioContext();
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();   // makes the tone
    const gain = ctx.createGain();        // controls the volume
    osc.type = shape;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(endVolume, start + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds);
    return { osc: osc, start: start };
}

// The four sounds used around the app
const SoundFX = {
    // A short rising "tap" when a card is tapped
    tap: function () {
        try {
            const sound = startSound('sine', 0.15, 0.01, 0.08, 0);
            sound.osc.frequency.setValueAtTime(800, sound.start);
            sound.osc.frequency.exponentialRampToValueAtTime(1200, sound.start + 0.08);
        } catch (error) {}
    },
    // Four happy notes going up
    success: function () {
        try {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            for (let i = 0; i < notes.length; i++) {
                const sound = startSound('triangle', 0.12, 0.001, 0.15, i * 0.07);
                sound.osc.frequency.setValueAtTime(notes[i], sound.start);
            }
        } catch (error) {}
    },
    // A low buzzing sound
    error: function () {
        try {
            const sound = startSound('sawtooth', 0.2, 0.01, 0.25, 0);
            sound.osc.frequency.setValueAtTime(180, sound.start);
            sound.osc.frequency.setValueAtTime(130, sound.start + 0.1);
        } catch (error) {}
    },
    // A tiny click for buttons
    click: function () {
        try {
            const sound = startSound('sine', 0.05, 0.001, 0.03, 0);
            sound.osc.frequency.setValueAtTime(400, sound.start);
        } catch (error) {}
    }
};

// Global Application State (Simulated In-Memory Database)
const appState = {
    isOfflineMode: false,
    pendingOfflineLogs: [],
    activeScannedCard: null,
    cards: [
        { uid: 'PSU-2026-0881', type: 'PSU_Student_ID', holder: 'Carl Francis Israel', balance: 340.00, status: 'Active' },
        { uid: 'BL-1002', type: 'General_BusLink', holder: 'Cydjian Aleca Ortinero', balance: 150.00, status: 'Active' },
        { uid: 'BL-1003', type: 'General_BusLink', holder: 'Juan Dela Cruz', balance: 45.00, status: 'Active' },
        { uid: 'PSU-2026-0942', type: 'PSU_Student_ID', holder: 'Maria Santos', balance: 220.00, status: 'Active' }
    ],
    psuStudents: [
        { studentId: '2026-0881', name: 'Carl Francis Israel', cardUid: 'PSU-2026-0881', course: 'BSIT-3', status: 'Enrolled' },
        { studentId: '2026-0942', name: 'Maria Santos', cardUid: 'PSU-2026-0942', course: 'BSCS-2', status: 'Enrolled' },
        { studentId: '2026-1104', name: 'Ramon Magsaysay', cardUid: 'PSU-2026-1104', course: 'BSBA-1', status: 'Enrolled' }
    ],
    schedules: [
        { unit: 'Bus #01', route: 'Goa - Naga via Pili', firstTrip: '04:30 AM', lastTrip: '07:30 PM', status: 'On Route' },
        { unit: 'Bus #04', route: 'Goa - Naga Express', firstTrip: '05:00 AM', lastTrip: '08:00 PM', status: 'Boarding' },
        { unit: 'Bus #08', route: 'Sangay - Naga', firstTrip: '05:15 AM', lastTrip: '06:45 PM', status: 'In Terminal' }
    ],
    fleet: [
        { busNo: 'Bus #01', plate: 'EVR-492', seats: '45/45', conductor: 'Mang Berting', status: 'Dispatched' },
        { busNo: 'Bus #04', plate: 'NCG-102', seats: '32/45', conductor: 'Kuya Pedro', status: 'Boarding' }
    ],
    mobileReceipts: [
        { ref: 'REF-8841', route: 'Goa to Naga', fare: 68.00, date: 'Today, 08:15 AM', type: 'PSU Student Discount', holder: 'Carl Francis Israel (PSU-2026-0881)' },
        { ref: 'REF-7204', route: 'Naga to Pili', fare: 32.00, date: 'Yesterday, 04:30 PM', type: 'PSU Student Discount', holder: 'Carl Francis Israel (PSU-2026-0881)' },
        { ref: 'REF-6109', route: 'Goa to Tigaon', fare: 14.40, date: 'May 12, 2026', type: 'PSU Student Discount', holder: 'Carl Francis Israel (PSU-2026-0881)' },
        { ref: 'REF-5021', route: 'Pili to Goa', fare: 48.00, date: 'May 10, 2026', type: 'PSU Student Discount', holder: 'Carl Francis Israel (PSU-2026-0881)' }
    ],
    fareDistances: {
        'Goa-Naga': { km: 48.5, base: 85.00 },
        'Goa-Pili': { km: 34.0, base: 60.00 },
        'Goa-Sangay': { km: 12.0, base: 25.00 },
        'Goa-Tigaon': { km: 7.5, base: 18.00 },
        'Tigaon-Naga': { km: 41.0, base: 72.00 },
        'Sangay-Naga': { km: 52.0, base: 90.00 },
        'Pili-Naga': { km: 14.5, base: 25.00 }
    }
};

// Transaction ledger. Field names follow the ERD (TRANSACTION + DIGITAL_RECEIPT).
// entry_type ('Fare' / 'Top-up') is a UI-only field: the ERD has no stored-value deposit entity yet.
appState.ledger = [];
for (let i = 0; i < appState.mobileReceipts.length; i++) {
    const r = appState.mobileReceipts[i];
    appState.ledger.push({
        transaction_id: r.ref, passenger_id: 'PSU-2026-0881', entry_type: 'Fare', route_name: r.route,
        amount_paid: r.fare, payment_method: 'Bus Link Card', payment_status: 'Paid', is_offline: false,
        sync_status: 'Synced', receipt_code: r.ref, created_at: r.date
    });
}
appState.busStudentCache = [];

// ===== Saving the data so every page shows the same information =====
// Each interface is its own page, so the data is kept in the browser's localStorage.
const SAVE_KEY = 'busLinkState';
const SAVED_FIELDS = ['cards', 'psuStudents', 'schedules', 'fleet', 'mobileReceipts', 'fareDistances', 'ledger', 'busStudentCache', 'pendingOfflineLogs'];

// Put the shared data into localStorage
function saveData() {
    try {
        const data = {};
        for (let i = 0; i < SAVED_FIELDS.length; i++) {
            data[SAVED_FIELDS[i]] = appState[SAVED_FIELDS[i]];
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (error) {
        console.log('Could not save the data', error);
    }
}

// Read the saved data back (if there is any)
function loadData() {
    try {
        const text = localStorage.getItem(SAVE_KEY);
        if (text === null) return;
        const data = JSON.parse(text);
        for (let i = 0; i < SAVED_FIELDS.length; i++) {
            if (data[SAVED_FIELDS[i]] !== undefined) {
                appState[SAVED_FIELDS[i]] = data[SAVED_FIELDS[i]];
            }
        }
        // The kiosk remembers which card is on the reader, so point it at the fresh copy of that card
        if (appState.activeScannedCard) {
            appState.activeScannedCard = findCardByUid(appState.activeScannedCard.uid);
        }
    } catch (error) {
        console.log('Could not load the data', error);
    }
}

loadData();                                      // when the page opens
setInterval(saveData, 1000);                     // then save every second
window.addEventListener('beforeunload', saveData);
window.addEventListener('pagehide', saveData);

// If another page (another tab or window) saves new data, show it here too
window.addEventListener('storage', function (event) {
    if (event.key === SAVE_KEY) {
        loadData();
        renderAll();
    }
});

// ===== Small helpers used everywhere =====
// Find a card by its UID (not case sensitive). Gives back null if there is no such card.
function findCardByUid(uid) {
    for (let i = 0; i < appState.cards.length; i++) {
        if (appState.cards[i].uid.toLowerCase() === String(uid).toLowerCase()) {
            return appState.cards[i];
        }
    }
    return null;
}

// Find the first card of a type: 'psu' = PSU student card, anything else = general card
function findCardByType(cardType) {
    const wanted = cardType === 'psu' ? 'PSU_Student_ID' : 'General_BusLink';
    for (let i = 0; i < appState.cards.length; i++) {
        if (appState.cards[i].type === wanted) {
            return appState.cards[i];
        }
    }
    return null;
}

// Find a university student by student ID
function findStudent(studentId) {
    for (let i = 0; i < appState.psuStudents.length; i++) {
        if (appState.psuStudents[i].studentId === studentId) {
            return appState.psuStudents[i];
        }
    }
    return null;
}

// Find one transaction in the ledger
function findTransaction(transactionId) {
    for (let i = 0; i < appState.ledger.length; i++) {
        if (appState.ledger[i].transaction_id === transactionId) {
            return appState.ledger[i];
        }
    }
    return null;
}

// Put text into an element, but only if that element is on this page
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// Redraw every table and list on the page that is open
function renderAll() {
    renderKioskSchedules();
    renderAdminCards();
    renderAdminFleet();
    renderPSUStudents();
    renderBusCache();
    refreshMobile();
    setText('admin-stat-pending-sync', `${appState.pendingOfflineLogs.length} Offline`);
}
const LOW_BALANCE = 100;
const PAYMENT_METHODS = [
    { method_name: 'GCash', provider: 'Mynt' },
    { method_name: 'Maya', provider: 'Maya Philippines' }
];
let selectedTopupMethod = 0;

// Record one money movement (a fare or a top-up) in the ledger and refresh the passenger app
function addLedger(card, entry_type, amount, method, route, opts = {}) {
    const n = Math.floor(1000 + Math.random() * 9000);
    const e = {
        transaction_id: `TXN-${n}`, passenger_id: card.uid, entry_type, route_name: route, amount_paid: amount,
        payment_method: method, payment_status: 'Paid', is_offline: !!opts.offline,
        sync_status: opts.offline ? 'Pending' : 'Synced', receipt_code: `RCPT-${n}`,
        created_at: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    appState.ledger.unshift(e);
    if (card === appState.cards[0]) refreshMobile();
    return e;
}

// Redraw the passenger app: balance, low-balance warning, and transaction lists
function refreshMobile() {
    if (!document.getElementById('mobile-app-balance')) return; // this interface is on another page
    const c = appState.cards[0];
    document.getElementById('mobile-app-balance').textContent = `₱${c.balance.toFixed(2)}`;
    document.getElementById('mobile-low-balance').classList.toggle('isHidden', c.balance >= LOW_BALANCE);
    renderMobileReceipts();
    renderFullMobileHistory();
}

// Initialize icons and initial data load
window.addEventListener('load', function () {
    lucide.createIcons();
    renderAll();
    calculateKioskFare();
    calculateConductorFare();
});

// ==========================================
// KIOSK LOGIC
// ==========================================
// ==========================================
// KIOSK
// ==========================================

// Kiosk: the passenger taps a card on the reader
function simulateTap(cardType) {
    SoundFX.tap();
    const card = findCardByType(cardType);
    if (!card) return;

    appState.activeScannedCard = card;

    const displayBadge = document.getElementById('kiosk-card-type-badge');
    if (card.type === 'PSU_Student_ID') {
        displayBadge.className = 'kioskBadgePsu';
        displayBadge.textContent = 'PSU Student ID Verified';
    } else {
        displayBadge.className = 'kioskBadgeGeneral';
        displayBadge.textContent = 'General Bus Link Card';
    }

    document.getElementById('kiosk-card-id').textContent = card.uid;
    document.getElementById('kiosk-holder-name').textContent = card.holder;
    document.getElementById('kiosk-balance').textContent = `₱${card.balance.toFixed(2)}`;

    SoundFX.success();
    showToast(`Card Tapped: ${card.holder} (${card.uid})`);
}

// Kiosk: add the chosen cash amount to the tapped card
function kioskAddCash(amount) {
    SoundFX.click();
    if (!appState.activeScannedCard) {
        SoundFX.error();
        showToast('Please tap a card first to deposit money!', 'error');
        return;
    }
    appState.activeScannedCard.balance += amount;
    addLedger(appState.activeScannedCard, 'Top-up', amount, 'Kiosk Cash', 'Terminal Kiosk');
    document.getElementById('kiosk-balance').textContent = `₱${appState.activeScannedCard.balance.toFixed(2)}`;
    refreshMobile();
    SoundFX.success();
    showToast(`Added ₱${amount} to ${appState.activeScannedCard.holder}`);
}

// Kiosk: ask the passenger to confirm the deposit
function confirmKioskDeposit() {
    if (!appState.activeScannedCard) {
        SoundFX.error();
        showToast('No active card scanned', 'error');
        return;
    }
    SoundFX.success();
    showToast(`Deposit completed successfully for ${appState.activeScannedCard.uid}`);
    renderAdminCards();
}

// Kiosk: work out the fare from the distance between two stops
function calculateKioskFare() {
    if (!document.getElementById('kiosk-origin')) return; // this interface is on another page
    const origin = document.getElementById('kiosk-origin').value;
    const dest = document.getElementById('kiosk-destination').value;

    if (origin === dest) {
        document.getElementById('kiosk-distance').textContent = '0 km';
        document.getElementById('kiosk-standard-fare').textContent = '₱0.00';
        document.getElementById('kiosk-student-fare').textContent = '₱0.00';
        return;
    }

    const key1 = `${origin}-${dest}`;
    const key2 = `${dest}-${origin}`;
    const fareData = appState.fareDistances[key1] || appState.fareDistances[key2] || { km: 25.0, base: 45.00 };

    const studentFare = fareData.base * 0.80;

    document.getElementById('kiosk-distance').textContent = `${fareData.km} km`;
    document.getElementById('kiosk-standard-fare').textContent = `₱${fareData.base.toFixed(2)}`;
    document.getElementById('kiosk-student-fare').textContent = `₱${studentFare.toFixed(2)}`;
}

// Kiosk: draw the bus schedule table
function renderKioskSchedules() {
    if (!document.getElementById('kiosk-schedule-table')) return; // this interface is on another page
    const tbody = document.getElementById('kiosk-schedule-table');
    let rowsHtml = '';
    for (let i = 0; i < appState.schedules.length; i++) {
        const s = appState.schedules[i];
        rowsHtml += `
        <tr class="tableRow">
            <td class="kioskCell">${s.unit}</td>
            <td class="kioskCell2">${s.route}</td>
            <td class="kioskCell3">${s.firstTrip}</td>
            <td class="kioskCell3">${s.lastTrip}</td>
            <td class="kioskCell2">
                <span class="statusBadge ${s.status === 'Boarding' ? 'statusBadgeBoarding' : 'statusBadgeDefault'}">
                    ${s.status}
                </span>
            </td>
        </tr>
    `;
    }
    tbody.innerHTML = rowsHtml;
}

// ==========================================
// ADMIN DASHBOARD LOGIC
// ==========================================
// ==========================================
// ADMIN
// ==========================================

// Admin: draw the card registry table (also used for the search box)
function renderAdminCards() {
    if (!document.getElementById('admin-card-search')) return; // this interface is on another page
    const query = (document.getElementById('admin-card-search')?.value || '').toLowerCase();
    const tbody = document.getElementById('admin-card-table-body');

    const filtered = [];
    for (let i = 0; i < appState.cards.length; i++) {
        const c = appState.cards[i];
        if (c.uid.toLowerCase().includes(query) || c.holder.toLowerCase().includes(query)) {
            filtered.push(c);
        }
    }

    let rowsHtml = '';
    for (let i = 0; i < filtered.length; i++) {
        const c = filtered[i];
        rowsHtml += `
        <tr class="tableRow">
            <td class="adminCell">${c.uid}</td>
            <td class="adminCell2">
                <span class="cardTypeChip ${c.type === 'PSU_Student_ID' ? 'cardTypeChipPsu' : 'cardTypeChipGeneral'}">
                    ${c.type === 'PSU_Student_ID' ? 'PSU Student ID' : 'General BusLink'}
                </span>
            </td>
            <td class="adminCell3">${c.holder}</td>
            <td class="adminCell4">₱${c.balance.toFixed(2)}</td>
            <td class="adminCell2">
                <span class="cardStatusChip ${c.status === 'Active' ? 'cardStatusChipActive' : 'cardStatusChipBlocked'}">
                    ${c.status}
                </span>
            </td>
            <td class="adminCell5">
                <button onclick="toggleCardBlock('${c.uid}')" class="adminBtn">
                    ${c.status === 'Active' ? 'Block' : 'Unblock'}
                </button>
            </td>
        </tr>
    `;
    }
    tbody.innerHTML = rowsHtml;
}

// Admin: block or unblock a card
function toggleCardBlock(uid) {
    SoundFX.click();
    const card = findCardByUid(uid);
    if (card) {
        card.status = card.status === 'Active' ? 'Blocked' : 'Active';
        renderAdminCards();
        SoundFX.success();
        showToast(`Card ${uid} set to ${card.status}`);
    }
}

// Admin: add money to a card at the counter
function handleAdminTopup(e) {
    e.preventDefault();
    const cardId = document.getElementById('admin-topup-card-id').value;
    const amount = parseFloat(document.getElementById('admin-topup-amount').value);

    const card = findCardByUid(cardId);
    if (card) {
        card.balance += amount;
        addLedger(card, 'Top-up', amount, 'Admin Counter', 'Admin Counter');
        renderAdminCards();
        refreshMobile();
        SoundFX.success();
        showToast(`Successfully deposited ₱${amount} into ${card.uid}`);
    } else {
        SoundFX.error();
        showToast(`Card UID ${cardId} not found in database!`, 'error');
    }
}

// Admin: draw the list of buses
function renderAdminFleet() {
    if (!document.getElementById('admin-fleet-list')) return; // this interface is on another page
    const container = document.getElementById('admin-fleet-list');
    let rowsHtml = '';
    for (let i = 0; i < appState.fleet.length; i++) {
        const f = appState.fleet[i];
        rowsHtml += `
        <div class="adminPanel2">
            <div>
                <span class="adminText">${f.busNo} (${f.plate})</span>
                <span class="adminConductorText">Conductor: ${f.conductor}</span>
            </div>
            <div class="adminPanel3">
                <span class="adminText2">${f.seats}</span>
                <span class="adminText3">${f.status}</span>
            </div>
        </div>
    `;
    }
    container.innerHTML = rowsHtml;
}

// Admin: open the "register new card" popup
function openRegisterCardModal() {
    SoundFX.click();
    document.getElementById('modal-register-card').classList.remove('isHidden');
}

// Admin: save a new card from the popup form
function handleRegisterCard(e) {
    e.preventDefault();
    const uid = document.getElementById('new-card-uid').value;
    const holder = document.getElementById('new-card-name').value;
    const balance = parseFloat(document.getElementById('new-card-balance').value);

    appState.cards.push({
        uid, type: 'General_BusLink', holder, balance, status: 'Active'
    });

    closeModal('modal-register-card');
    renderAdminCards();
    SoundFX.success();
    showToast(`Issued new card ${uid} for ${holder}`);
}

// ==========================================
// CONDUCTOR SCANNER POS LOGIC
// ==========================================
// ==========================================
// CONDUCTOR POS
// ==========================================

// Conductor: switch between online and offline mode
function toggleOfflineMode() {
    SoundFX.click();
    appState.isOfflineMode = !appState.isOfflineMode;
    const btn = document.getElementById('pos-offline-toggle');
    const syncBar = document.getElementById('pos-sync-bar');
    const globalSyncBadge = document.getElementById('global-sync-badge');
    const globalSyncText = document.getElementById('global-sync-text');

    if (appState.isOfflineMode) {
        btn.className = 'syncToggleOffline';
        document.getElementById('pos-net-status-text').textContent = 'OFFLINE MODE';
        syncBar.classList.remove('isHidden');
        globalSyncBadge.className = 'syncDotOffline';
        globalSyncText.className = 'syncTextOffline';
        globalSyncText.textContent = 'Bus Terminal Offline (Local DB Storage)';
        SoundFX.error();
        showToast('Conductor POS switched to OFFLINE mode (SQLite local storage enabled)');
    } else {
        btn.className = 'syncToggleOnline';
        document.getElementById('pos-net-status-text').textContent = 'ONLINE MODE';
        syncBar.classList.add('isHidden');
        globalSyncBadge.className = 'syncDotOnline';
        globalSyncText.className = 'syncTextOnline';
        globalSyncText.textContent = 'Server Online (Auto-Sync)';
        SoundFX.success();
        forcePOSSync();
    }
}

// Conductor: work out the regular and student fare for the chosen trip
function calculateConductorFare() {
    if (!document.getElementById('conductor-origin')) return; // this interface is on another page
    const origin = document.getElementById('conductor-origin').value;
    const dest = document.getElementById('conductor-destination').value;
    const key1 = `${origin}-${dest}`;
    const key2 = `${dest}-${origin}`;
    const fareData = appState.fareDistances[key1] || appState.fareDistances[key2] || { km: 25.0, base: 45.00 };

    const studentFare = fareData.base * 0.80;
    document.getElementById('pos-fare-regular').textContent = `Regular: ₱${fareData.base.toFixed(2)}`;
    document.getElementById('pos-fare-student').textContent = `PSU Discount: ₱${studentFare.toFixed(2)}`;

    return { regular: fareData.base, student: studentFare, origin, dest };
}

// Conductor: scan a card and take the fare from its balance
function conductorScan(cardType) {
    SoundFX.tap();
    const fareInfo = calculateConductorFare();
    const card = findCardByType(cardType);

    if (!card) return;

    const fareToDeduct = card.type === 'PSU_Student_ID' ? fareInfo.student : fareInfo.regular;

    if (card.balance < fareToDeduct) {
        SoundFX.error();
        renderPOSResult('error', 'INSUFFICIENT BALANCE', `Balance ₱${card.balance.toFixed(2)} is lower than fare ₱${fareToDeduct.toFixed(2)}`, card);
        return;
    }

    card.balance -= fareToDeduct;
    addLedger(card, 'Fare', fareToDeduct, 'Bus Link Card', `${fareInfo.origin} -> ${fareInfo.dest}`, { offline: appState.isOfflineMode });

    const log = {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        cardUid: card.uid,
        holder: card.holder,
        fare: fareToDeduct,
        route: `${fareInfo.origin} -> ${fareInfo.dest}`,
        time: new Date().toLocaleTimeString(),
        offline: appState.isOfflineMode
    };

    if (appState.isOfflineMode) {
        appState.pendingOfflineLogs.push(log);
        document.getElementById('pos-pending-count').textContent = `${appState.pendingOfflineLogs.length} Pending Logs`;
        setText('admin-stat-pending-sync', `${appState.pendingOfflineLogs.length} Offline`);
    }

    SoundFX.success();
    renderPOSResult('success', 'PAYMENT SUCCESSFUL', `Fare ₱${fareToDeduct.toFixed(2)} deducted (${card.type === 'PSU_Student_ID' ? 'PSU 20% Discounted' : 'Regular'})`, card);
    renderAdminCards();
}

// Conductor: show the green "success" or red "error" result box
function renderPOSResult(status, title, subtitle, card) {
    const resScreen = document.getElementById('pos-result-screen');
    if (status === 'success') {
        resScreen.className = 'posResultSuccess';
        resScreen.innerHTML = `
            <div class="conductorPanel">
                <i data-lucide="check-circle-2" class="conductorIconCheckCircle2"></i>
            </div>
            <h4 class="conductorTitle">${title}</h4>
            <p class="conductorText3">${subtitle}</p>
            <div class="conductorPanel2">
                <span>Card: ${card.uid}</span>
                <span class="conductorRemainingBalText">Remaining Bal: ₱${card.balance.toFixed(2)}</span>
            </div>
        `;
    } else {
        resScreen.className = 'posResultError';
        resScreen.innerHTML = `
            <div class="conductorPanel3">
                <i data-lucide="alert-triangle" class="conductorIconCheckCircle2"></i>
            </div>
            <h4 class="conductorTitle2">${title}</h4>
            <p class="conductorText4">${subtitle}</p>
        `;
    }
    lucide.createIcons();
}

// Conductor: check a QR ticket from the passenger app
function verifyQRTicket() {
    SoundFX.click();
    const input = document.getElementById('pos-qr-input').value;
    if (!input) {
        SoundFX.error();
        showToast('Please enter Reference ID', 'error');
        return;
    }
    SoundFX.success();
    renderPOSResult('success', 'VALID E-TICKET QR', `Ticket Ref ${input} Verified & Used`, appState.cards[0]);
}

// Conductor: send the offline payments to the server
function forcePOSSync() {
    SoundFX.click();
    if (appState.pendingOfflineLogs.length === 0) {
        showToast('No pending offline logs to sync.');
        return;
    }
    const count = appState.pendingOfflineLogs.length;
    appState.pendingOfflineLogs = [];
    document.getElementById('pos-pending-count').textContent = `0 Pending Logs`;
    setText('admin-stat-pending-sync', `0 Offline`);
    SoundFX.success();
    showToast(`Successfully synchronized ${count} offline transactions to central database!`);
}

// ==========================================
// PASSENGER MOBILE APP LOGIC
// ==========================================
// ==========================================
// PASSENGER APP
// ==========================================

// Passenger app: change the screen (home / history / ...)
function switchMobileTab(subviewId) {
    SoundFX.click();
    const mobileSubviewList = document.querySelectorAll('.mobileSubview');
    for (let i = 0; i < mobileSubviewList.length; i++) {
        mobileSubviewList[i].classList.add('isHidden');
    }
    document.getElementById(`mobile-subview-${subviewId}`).classList.remove('isHidden');

    const mobileNavBtnList = document.querySelectorAll('.mobileNavBtn');
    for (let i = 0; i < mobileNavBtnList.length; i++) {
        mobileNavBtnList[i].classList.remove('isActive');
    }
    const activeBtn = document.getElementById(`mobile-nav-${subviewId}`);
    if (activeBtn) activeBtn.classList.add('isActive');

    if (subviewId === 'history') {
        renderFullMobileHistory();
    }
}

// Passenger app: the list of transactions that belong to this passenger
function myLedger() {
    const mine = [];
    for (let i = 0; i < appState.ledger.length; i++) {
        if (appState.ledger[i].passenger_id === appState.cards[0].uid) {
            mine.push(appState.ledger[i]);
        }
    }
    return mine;
}

// Passenger app: build the HTML for one transaction row
function ledgerRowHTML(r) {
    const topup = r.entry_type === 'Top-up';
    return `
        <div onclick="openReceiptDetailModal('${r.transaction_id}')" class="appPanel">
            <div>
                <span class="appText">${topup ? 'E-Wallet / Cash Top-Up' : r.route_name}</span>
                <span class="appText2">${r.created_at} • ${r.payment_method}${r.is_offline ? ' • Offline' : ''}</span>
            </div>
            <div class="appPanel2">
                <span class="ledgerAmount ${topup ? 'ledgerAmountIn' : 'ledgerAmountOut'}">${topup ? '+' : '-'}₱${r.amount_paid.toFixed(2)}</span>
                <span class="appText3">${r.receipt_code}</span>
            </div>
        </div>`;
}

// Passenger app: the 3 newest transactions on the home screen
function renderMobileReceipts() {
    if (!document.getElementById('mobile-receipts-list')) return; // this interface is on another page
    const mine = myLedger();
    let rowsHtml = '';
    for (let i = 0; i < mine.length && i < 3; i++) {   // only the 3 newest
        rowsHtml += ledgerRowHTML(mine[i]);
    }
    document.getElementById('mobile-receipts-list').innerHTML = rowsHtml;
}

// Passenger app: the full transaction history
function renderFullMobileHistory() {
    if (!document.getElementById('mobile-full-history-list')) return; // this interface is on another page
    const mine = myLedger();
    let rowsHtml = '';
    for (let i = 0; i < mine.length; i++) {
        rowsHtml += ledgerRowHTML(mine[i]);
    }
    document.getElementById('mobile-full-history-list').innerHTML = rowsHtml;
}

// Passenger app: open the receipt popup for one transaction
function openReceiptDetailModal(refId) {
    SoundFX.click();
    const r = findTransaction(refId);
    if (!r) return;
    const card = findCardByUid(r.passenger_id);
    const topup = r.entry_type === 'Top-up';
    document.getElementById('ticket-modal-title').textContent = 'Digital Receipt';
    document.getElementById('ticket-modal-subtitle').textContent = `${topup ? 'Deposit' : 'Fare payment'} • ${r.sync_status}`;
    document.getElementById('ticket-ref-display').textContent = r.receipt_code;
    document.getElementById('ticket-route-display').textContent = topup ? `Top-up via ${r.payment_method}` : r.route_name;
    document.getElementById('ticket-fare-display').textContent = `₱${r.amount_paid.toFixed(2)} (${r.payment_method})`;
    document.getElementById('ticket-holder-display').textContent = `${card ? card.holder : ''} (${r.passenger_id})`;
    document.getElementById('ticket-status-display').textContent = r.payment_status.toUpperCase();
    document.getElementById('modal-mobile-ticket').classList.remove('isHidden');
}

// Passenger app: draw the e-wallet buttons (GCash, Maya)
function renderTopupMethods() {
    let rowsHtml = '';
    for (let i = 0; i < PAYMENT_METHODS.length; i++) {
        const m = PAYMENT_METHODS[i];
        rowsHtml += `
        <button onclick="selectTopupMethod(${i})" class="topupMethod ${i === selectedTopupMethod ? 'topupMethodSelected' : 'topupMethodIdle'}">
            <span class="passengerText">${m.method_name}</span>
            <span class="passengerText2">${m.provider}</span>
        </button>`;
    }
    document.getElementById('topup-methods').innerHTML = rowsHtml;
}

// Passenger app: choose an e-wallet
function selectTopupMethod(i) { SoundFX.click(); selectedTopupMethod = i; renderTopupMethods(); }
// Passenger app: fill the amount box from a quick button
function setTopupAmount(a) { SoundFX.click(); document.getElementById('topup-amount').value = a; }

// Passenger app: open the top-up popup
function openMobileTopupModal() {
    SoundFX.click();
    selectedTopupMethod = 0;
    document.getElementById('topup-amount').value = '';
    renderTopupMethods();
    document.getElementById('modal-mobile-topup').classList.remove('isHidden');
}

// Passenger app: add the e-wallet top-up to the balance
function confirmMobileTopup() {
    const amount = parseFloat(document.getElementById('topup-amount').value);
    if (!(amount >= 10 && amount <= 5000)) {
        SoundFX.error();
        showToast('Enter an amount between ₱10 and ₱5,000', 'error');
        return;
    }
    const method = PAYMENT_METHODS[selectedTopupMethod].method_name;
    const card = appState.cards[0];
    card.balance += amount;
    addLedger(card, 'Top-up', amount, method, `E-Wallet Top-Up (${method})`);
    closeModal('modal-mobile-topup');
    SoundFX.success();
    showToast(`₱${amount.toFixed(2)} added via ${method}`);
    renderAdminCards();
}

// Passenger app: open the QR ticket popup
function openMobileTicketModal() {
    SoundFX.click();
    document.getElementById('ticket-modal-title').textContent = 'Bus Link E-Ticket QR';
    document.getElementById('ticket-modal-subtitle').textContent = 'Show this QR code or Ref ID to the bus conductor scanner';
    document.getElementById('ticket-ref-display').textContent = 'REF-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('ticket-route-display').textContent = 'Goa Central -> Naga Hub';
    document.getElementById('ticket-fare-display').textContent = 'Auto-Deduct on Tap';
    document.getElementById('ticket-holder-display').textContent = 'Carl Francis Israel (PSU-2026-0881)';

    document.getElementById('modal-mobile-ticket').classList.remove('isHidden');
}

// ==========================================
// PARTIDO STATE UNIVERSITY PORTAL LOGIC
// ==========================================
// ==========================================
// UNIVERSITY PORTAL
// ==========================================

// University: draw the student database table
function renderPSUStudents() {
    if (!document.getElementById('psu-student-table')) return; // this interface is on another page
    const tbody = document.getElementById('psu-student-table');
    let rowsHtml = '';
    for (let i = 0; i < appState.psuStudents.length; i++) {
        const s = appState.psuStudents[i];
        rowsHtml += `
        <tr class="tableRow">
            <td class="universityCell">${s.studentId}</td>
            <td class="universityCell2">${s.cardUid}</td>
            <td class="universityCell3">${s.name}</td>
            <td class="universityCell4">${s.course}</td>
            <td class="universityCell5">
                <span class="universityText">
                    ${s.status}
                </span>
            </td>
            <td class="universityCell5">
                <button onclick="syncStudentSingle('${s.studentId}')" class="universityShareBusBtn">
                    Share with Bus Link
                </button>
            </td>
        </tr>
    `;
    }
    tbody.innerHTML = rowsHtml;
}

// University: the accountant deposits money to a student card
function handlePSUTopup(e) {
    e.preventDefault();
    const studentId = document.getElementById('psu-topup-id').value.trim();
    const amount = parseFloat(document.getElementById('psu-topup-amount').value);
    const student = findStudent(studentId);
    const card = student && findCardByUid(student.cardUid);

    if (!card) {
        SoundFX.error();
        showToast('Student ID not found or no Bus Link card issued', 'error');
        return;
    }
    card.balance += amount;
    const entry = addLedger(card, 'Top-up', amount, 'University Cashier', 'University Cashier Deposit');
    const log = document.getElementById('psu-deposit-log');
    if (log.querySelector('p')) log.innerHTML = '';
    log.insertAdjacentHTML('afterbegin', `
        <div class="passengerPanel2">
            <span class="passengerText3">${student.name} <span class="passengerText4">${entry.receipt_code}</span></span>
            <span class="passengerActiveValidatedText">+₱${amount.toFixed(2)}</span>
        </div>`);
    SoundFX.success();
    showToast(`Cashier receipt ${entry.receipt_code}: ₱${amount} added to ${student.name}`);
    renderAdminCards();
}

// University: show the limited student details that Bus Link received
function renderBusCache() {
    if (!document.getElementById('bus-student-cache')) return; // this interface is on another page
    const rows = appState.busStudentCache;
    let rowsHtml = '';
    for (let i = 0; i < rows.length; i++) {
        const s = rows[i];
        rowsHtml += `
        <tr><td class="universityCell6">${s.studentId}</td><td>${s.name}</td><td class="universityCell7">${s.cardUid}</td><td class="ledgerAmountIn">${s.status}</td></tr>`;
    }
    if (rows.length === 0) {
        rowsHtml = '<tr><td colspan="4" class="universityNoDataCell">No data requested yet.</td></tr>';
    }
    document.getElementById('bus-student-cache').innerHTML = rowsHtml;
}

// Bus Link only receives limited fields (no course or other university records)
// University: give Bus Link ONLY the important details of one student
function shareLimited(s) {
    const limited = { studentId: s.studentId, name: s.name, cardUid: s.cardUid, status: s.status };
    // If Bus Link already has this student, update the record. If not, add it.
    for (let i = 0; i < appState.busStudentCache.length; i++) {
        if (appState.busStudentCache[i].studentId === s.studentId) {
            appState.busStudentCache[i] = limited;
            return;
        }
    }
    appState.busStudentCache.push(limited);
}

// University: Bus Link requests the details of all students
function syncUniversityRegistry() {
    SoundFX.click();
    showToast('Bus Link is requesting student details from the PSU database...');
    setTimeout(function () {
        for (let i = 0; i < appState.psuStudents.length; i++) {
            shareLimited(appState.psuStudents[i]);
        }
        renderBusCache();
        SoundFX.success();
        showToast('Received limited details only: Student ID, name, card UID, status.');
    }, 800);
}

// University: share the details of one student with Bus Link
function syncStudentSingle(id) {
    const s = findStudent(id);
    if (!s) return;
    shareLimited(s);
    renderBusCache();
    SoundFX.success();
    showToast(`Shared limited details of ${id} with Bus Link.`);
}

// ==========================================
// UTILS & TOASTS
// ==========================================
// ==========================================
// POPUPS AND MESSAGES
// ==========================================

// Close any popup by its id
function closeModal(modalId) {
    SoundFX.click();
    document.getElementById(modalId).classList.add('isHidden');
}

// Show a small message in the corner that disappears after 3 seconds
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toastError' : 'toastInfo'}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'error' ? 'alert-circle' : 'info'}" class="toastIcon"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(function () {
        toast.classList.add('toastLeaving');
        setTimeout(function () {
            toast.remove();
        }, 300);
    }, 3000);
}
