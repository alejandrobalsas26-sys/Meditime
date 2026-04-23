/**
 * MediTime PRO - Logic (v2.1 Secure)
 */

// --- STATE ---
let medicines = [];
let settings = {
    a11yMode: false,
    highContrast: false
};
let synthesis = window.speechSynthesis;

// --- DOM ELEMENTS ---
const viewIds = ['view-welcome', 'view-menu', 'view-add', 'view-list', 'view-emergency', 'view-settings'];
const views = {};
viewIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) views[id.replace('view-', '')] = el;
});

const navButtons = document.querySelectorAll('.nav-btn');
const form = document.getElementById('add-medicine-form');
const listContainer = document.getElementById('medicine-list-container');
const modal = document.getElementById('notification-modal');
const locationDisplay = document.getElementById('location-display');

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    renderList();
    updateDashboard();
    startReminderLoop();

    // Permission for notifications
    if ("Notification" in window) {
        Notification.requestPermission();
    }
});

function loadData() {
    const savedMeds = localStorage.getItem('meditime_meds');
    if (savedMeds) medicines = JSON.parse(savedMeds);

    const savedSettings = localStorage.getItem('meditime_settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        applySettings();
    }

    // Update UI toggles
    const a11yToggle = document.getElementById('setting-a11y-toggle');
    const contrastToggle = document.getElementById('setting-contrast-toggle');

    if (a11yToggle) a11yToggle.checked = settings.a11yMode;
    if (contrastToggle) contrastToggle.checked = settings.highContrast;
}

function saveData() {
    localStorage.setItem('meditime_meds', JSON.stringify(medicines));
    updateDashboard();
}

function saveSettings() {
    localStorage.setItem('meditime_settings', JSON.stringify(settings));
    applySettings();
}

// --- NAVIGATION ---
window.navigateTo = function (viewName) {
    // Hide all
    Object.values(views).forEach(el => el && el.classList.remove('active'));

    // Show target
    if (views[viewName]) {
        views[viewName].classList.add('active');
    }

    // Update Bottom Nav
    navButtons.forEach(btn => {
        if (btn.dataset.target === viewName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (viewName === 'list') renderList();
    if (viewName === 'welcome') updateDashboard();

    // Special Case: Emergency
    if (viewName === 'emergency') {
        initEmergency();
        speak("Modo de emergencia activado. Obteniendo ubicación.");
    } else {
        speak("Navegando a " + viewName);
    }
};

// --- EMERGENCY LOGIC ---
function initEmergency() {
    if (!locationDisplay) return;
    locationDisplay.textContent = "📡 Obteniendo satélites...";

    if (!navigator.geolocation) {
        locationDisplay.textContent = "❌ GPS no soportado en este dispositivo.";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(5);
            const lng = position.coords.longitude.toFixed(5);
            const acc = Math.round(position.coords.accuracy);

            // Safe DOM update using textContent where possible, or controlled HTML
            locationDisplay.innerHTML = '';

            const div = document.createElement('div');
            div.innerHTML = `
                LAT: <span style="font-weight:bold; color:#ffeb3b">${lat}</span><br>
                LON: <span style="font-weight:bold; color:#ffeb3b">${lng}</span><br>
                <span style="font-size:0.8em; opacity:0.8">(Precisión: ${acc} metros)</span>
            `;
            locationDisplay.appendChild(div);

            speak(`Ubicación obtenida. Latitud ${lat}, Longitud ${lng}.`);
        },
        (error) => {
            console.error(error);
            let msg = "❌ Error GPS: ";
            switch (error.code) {
                case error.PERMISSION_DENIED: msg += "Permiso denegado."; break;
                case error.POSITION_UNAVAILABLE: msg += "Señal no disponible."; break;
                case error.TIMEOUT: msg += "Tiempo agotado."; break;
                default: msg += "Error desconocido.";
            }
            locationDisplay.textContent = msg + " Asegúrese de activar la ubicación.";
            speak("No se pudo obtener la ubicación. Verifique los permisos.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// --- CORE APP LOGIC ---

function setupEventListeners() {
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            addMedicine();
        });
    }

    const a11yToggle = document.getElementById('setting-a11y-toggle');
    if (a11yToggle) {
        a11yToggle.addEventListener('change', (e) => {
            settings.a11yMode = e.target.checked;
            saveSettings();
            speak("Modo voz " + (settings.a11yMode ? "activado" : "desactivado"));
        });
    }

    const contrastToggle = document.getElementById('setting-contrast-toggle');
    if (contrastToggle) {
        contrastToggle.addEventListener('change', (e) => {
            settings.highContrast = e.target.checked;
            saveSettings();
            speak("Alto contraste " + (settings.highContrast ? "activado" : "desactivado"));
        });
    }

    const clearBtn = document.getElementById('btn-clear-data');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm("¿Estás seguro de borrar todos los datos?")) {
                localStorage.clear();
                location.reload();
            }
        });
    }

    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            speak("Sistema de voz activo. Hola.");
        });
    }

    // Modal
    const confirmBtn = document.getElementById('btn-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const id = modal.dataset.medId;
            confirmMedicine(id);
            closeModal();
        });
    }

    const snoozeBtn = document.getElementById('btn-snooze');
    if (snoozeBtn) {
        snoozeBtn.addEventListener('click', () => {
            closeModal();
            speak("Pospuesto.");
        });
    }
}

// Validate Inputs for Security
function sanitizeInput(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function addMedicine() {
    const nameInput = document.getElementById('med-name');
    const doseInput = document.getElementById('med-dose');

    // Sanitize
    const name = nameInput.value.replace(/[^a-zA-Z0-9\sñÑ]/g, '').trim();
    const dose = doseInput.value.replace(/[^a-zA-Z0-9\smg\.]/g, '').trim();

    const time = document.getElementById('med-time').value;
    const priority = document.getElementById('med-priority').value;

    if (!name || !dose || !time) {
        alert("Por favor complete todos los campos correctamente.");
        return;
    }

    const newMed = {
        id: Date.now(),
        name, dose, time, priority,
        confirmedToday: false,
        lastConfirmedDate: null
    };

    medicines.push(newMed);
    saveData();
    form.reset();
    speak("Medicamento guardado.");
    navigateTo('list');
}

function renderList() {
    if (!listContainer) return;
    listContainer.innerHTML = ''; // Clear existing

    if (medicines.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.padding = '20px';
        emptyDiv.style.color = '#999';
        emptyDiv.textContent = 'No hay medicamentos.';
        listContainer.appendChild(emptyDiv);
        return;
    }

    // Sort by time
    medicines.sort((a, b) => a.time.localeCompare(b.time));

    medicines.forEach(med => {
        // Create Item Container
        const item = document.createElement('div');
        item.className = 'med-item';
        if (med.priority === 'URGENTE') item.style.borderLeft = '4px solid red';

        // Info Section
        const infoDiv = document.createElement('div');
        infoDiv.className = 'med-info';

        const h3 = document.createElement('h3');
        // Securely set text content (prevents XSS)
        h3.textContent = med.name + " ";

        const doseSpan = document.createElement('span');
        doseSpan.style.fontSize = '0.8em';
        doseSpan.style.color = '#999';
        doseSpan.textContent = `(${med.dose})`;
        h3.appendChild(doseSpan);

        const p = document.createElement('p');
        const statusIcon = med.confirmedToday ? "✅" : "⏳";
        p.textContent = `⏰ ${med.time} | ${statusIcon}`;

        infoDiv.appendChild(h3);
        infoDiv.appendChild(p);

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.style.background = 'none';
        delBtn.style.border = 'none';
        delBtn.style.fontSize = '1.2rem';
        delBtn.textContent = '🗑️';
        delBtn.onclick = () => deleteMedicine(med.id);

        item.appendChild(infoDiv);
        item.appendChild(delBtn);

        listContainer.appendChild(item);
    });
}

window.deleteMedicine = function (id) {
    if (confirm("¿Eliminar?")) {
        medicines = medicines.filter(m => m.id !== id);
        saveData();
        renderList();
    }
};

function confirmMedicine(id) {
    const med = medicines.find(m => m.id == id);
    if (med) {
        med.confirmedToday = true;
        med.lastConfirmedDate = new Date().toDateString();
        saveData();
        renderList();
        updateDashboard();
        speak("Excelente. Medicamento confirmado.");
    }
}

function updateDashboard() {
    const total = medicines.length;
    // Check Date
    const todayStr = new Date().toDateString();
    medicines.forEach(m => {
        if (m.lastConfirmedDate !== todayStr) m.confirmedToday = false;
    });

    const taken = medicines.filter(m => m.confirmedToday).length;

    const percent = total === 0 ? 0 : Math.round((taken / total) * 100);
    const progLabel = document.getElementById('progress-percent');
    if (progLabel) progLabel.textContent = `${percent}%`;

    const summaryLabel = document.getElementById('today-summary');
    if (summaryLabel) summaryLabel.textContent = `Has tomado ${taken} de ${total} dosis hoy.`;

    // Update graphic ring
    const ring = document.querySelector('.status-ring');
    if (ring) {
        ring.style.background = `conic-gradient(var(--primary-color) ${percent}%, #eee ${percent}%)`;
    }
}

// --- UTILS ---

function applySettings() {
    if (settings.a11yMode) document.body.classList.add('a11y-mode');
    else document.body.classList.remove('a11y-mode');

    if (settings.highContrast) document.body.classList.add('high-contrast');
    else document.body.classList.remove('high-contrast');
}

function speak(text) {
    if (!settings.a11yMode) return;
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    synthesis.speak(utterance);
}

// Global variable to track last alerted minute
let lastAlertMinute = "";

function startReminderLoop() {
    setInterval(() => {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMin = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMin}`;

        // Prevent multiple alerts in same minute
        if (currentTime === lastAlertMinute) return;

        medicines.forEach(med => {
            if (med.time === currentTime && !med.confirmedToday) {
                lastAlertMinute = currentTime;
                triggerAlarm(med);
            }
        });
    }, 5000);
}

function triggerAlarm(med) {
    const title = document.getElementById('notif-title');
    const msg = document.getElementById('notif-message');

    if (title) title.textContent = `¡HORA DE ${med.name.toUpperCase()}!`;
    if (msg) msg.textContent = `Dosis: ${med.dose}`;

    if (modal) {
        modal.dataset.medId = med.id;
        modal.style.display = 'flex';
    }

    speak(`Atención. Hora de tomar ${med.name}`);

    if (Notification.permission === "granted") {
        new Notification("💊 MediTime", { body: `Hora de tomar ${med.name}` });
    }
}

function closeModal() {
    if (modal) modal.style.display = 'none';
}
