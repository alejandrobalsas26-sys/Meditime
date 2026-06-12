/* ─────────────────────────────────────────────────────────
   MediTime PRO — app.js  v3.0
   Vanilla JS · No frameworks · No eval() · No innerHTML with user data
   ───────────────────────────────────────────────────────── */

'use strict';

// ══════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════
const STORAGE_KEY  = 'meditime_v3';
const REMINDER_INTERVAL_MS = 30_000;
const SOS_HOLD_MS  = 2000;     // mantener pulsado el botón SOS para activarlo
const HISTORY_DAYS = 30;
const ALARM_GRACE_MS   = 120 * 60_000; // una dosis se sigue avisando hasta 2 h tarde
const ALARM_REALERT_MS = 5 * 60_000;   // re-aviso cada 5 min mientras no se confirme
const TAG_COLORS = ['#0D9488','#7C3AED','#D97706','#DC2626','#16A34A','#0EA5E9','#EC4899','#64748B'];

const FREQ_LABELS = {
  diario:  'Todos los días',
  semana:  'Lun – Vie',
  finde:   'Sáb – Dom',
  alterno: 'Días alternos',
};

// ══════════════════════════════════════════════════════════
// PLUGIN INITIALISATION
// Resolved only when running inside a Capacitor WebView.
// Both handles stay null in a plain browser so the PWA
// falls back to localStorage and skips biometric gating.
// ══════════════════════════════════════════════════════════
let _BiometricAuth = null;   // capacitor-native-biometric ≥4
let _SecureStorage = null;   // capacitor-secure-storage-plugin ^0.10
let _LocalNotifications = null; // @capacitor/local-notifications ^6

function _resolvePlugins() {
  try {
    if (
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform()
    ) {
      const P        = window.Capacitor.Plugins;
      _BiometricAuth = P.NativeBiometric      || null;
      _SecureStorage = P.SecureStoragePlugin  || null;
      _LocalNotifications = P.LocalNotifications || null;
    }
  } catch (_) {}
}

// ══════════════════════════════════════════════════════════
// LOCK SCREEN
// Rendered when biometric verification fails or is
// cancelled. Hides the entire app shell so no patient
// data is visible until the user re-authenticates.
// ══════════════════════════════════════════════════════════
function _showLockScreen(reason) {
  const appMain   = document.getElementById('app-main');
  const bottomNav = document.querySelector('.bottom-nav');
  const topBar    = document.querySelector('.top-bar');
  if (appMain)   appMain.hidden   = true;
  if (bottomNav) bottomNav.hidden = true;
  if (topBar)    topBar.hidden    = true;

  const existing = document.getElementById('lock-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lock-overlay';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'lock-title');
  overlay.setAttribute('aria-describedby', 'lock-desc');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'gap:16px', 'padding:32px',
    'background:var(--bg,#F0FDFA)',
    'font-family:inherit',
  ].join(';');

  const icon = document.createElement('div');
  icon.setAttribute('aria-hidden', 'true');
  icon.style.cssText = 'font-size:3rem;line-height:1';
  icon.textContent = '🔒';

  const title = document.createElement('h2');
  title.id = 'lock-title';
  title.style.cssText = 'margin:0;font-size:1.25rem;color:var(--text,#134e4a)';
  title.textContent = 'Acceso bloqueado';

  const desc = document.createElement('p');
  desc.id = 'lock-desc';
  desc.style.cssText = 'margin:0;font-size:0.95rem;color:var(--text-muted,#5eead4);text-align:center;max-width:280px';
  desc.textContent = reason || 'No se pudo verificar la identidad. Reinicia la aplicación.';

  const retryBtn = document.createElement('button');
  retryBtn.style.cssText = [
    'margin-top:8px', 'padding:12px 28px',
    'border:none', 'border-radius:12px',
    'background:var(--primary,#0D9488)',
    'color:#fff', 'font-size:1rem', 'cursor:pointer',
  ].join(';');
  retryBtn.textContent = 'Reintentar';
  retryBtn.setAttribute('aria-label', 'Reintentar autenticación biométrica');
  retryBtn.addEventListener('click', () => {
    overlay.remove();
    init();
  });

  overlay.appendChild(icon);
  overlay.appendChild(title);
  overlay.appendChild(desc);
  overlay.appendChild(retryBtn);
  document.body.appendChild(overlay);
  retryBtn.focus();
}

// ══════════════════════════════════════════════════════════
// STATE — everything in one versioned object
// ══════════════════════════════════════════════════════════
let state = {
  medicines:  [],    // array of Medicine objects
  history:    [],    // array of HistoryEntry objects
  settings: {
    ttsEnabled:       false,
    highContrast:     false,
    bigFont:          false,
    darkMode:         false,
    doubleTap:        false,
    notifEnabled:     false,
    snoozeMinutes:    10,
    sosNumber:        '911',
  },
  profile: {
    name:        '',
    age:         '',
    doctorName:  '',
    doctorPhone: '',
  },
  contacts: [], // [{id, name, phone}]
};

// Runtime-only (never persisted)
let sosTimerID     = null;
let sosHoldTimer   = null;     // timer de pulsación larga del botón SOS
let reminderTimer  = null;
let alarmAlerts     = {};      // {"medId|HH:MM": ts del último aviso}
let alarmAlertsDate = '';      // día al que pertenecen esos avisos
let doubleTapState = { el: null, ts: 0 };
let currentView    = 'inicio';
let editMedId      = null;     // null = new, string = editing existing

// ══════════════════════════════════════════════════════════
// MEDICINE MODEL
// ══════════════════════════════════════════════════════════
function createMedicine(fields) {
  return {
    id:         String(Date.now()) + Math.random().toString(36).slice(2),
    name:       fields.name        || '',
    dose:       fields.dose        || '',
    notes:      fields.notes       || '',
    times:      fields.times       || [],         // ['08:00','20:00']
    frequency:  fields.frequency   || 'diario',
    priority:   fields.priority    || 'normal',   // 'normal'|'urgente'
    color:      fields.color       || TAG_COLORS[0],
    confirmedToday: {},   // {HH:MM: true/false}
    lastResetDate:  '',
    snoozedUntil:   {},   // {HH:MM: timestamp}
    createdAt:  Date.now(),
  };
}

function createHistoryEntry(medId, medName, time, action) {
  return {
    id:        String(Date.now()) + Math.random().toString(36).slice(2),
    medId,
    medName,
    time,
    action,   // 'taken'|'skipped'|'snoozed'
    ts:       Date.now(),
  };
}

// ══════════════════════════════════════════════════════════
// PERSISTENCE  (TEE/KMS — async)
// ══════════════════════════════════════════════════════════

// Merges a parsed storage object into the live state tree.
function _applyParsed(parsed) {
  if (!parsed || typeof parsed !== 'object') return;
  if (Array.isArray(parsed.medicines)) state.medicines = parsed.medicines;
  if (Array.isArray(parsed.history))   state.history   = parsed.history;
  if (parsed.settings && typeof parsed.settings === 'object') {
    Object.assign(state.settings, parsed.settings);
  }
  if (parsed.profile && typeof parsed.profile === 'object') {
    Object.assign(state.profile, parsed.profile);
  }
  if (Array.isArray(parsed.contacts)) state.contacts = parsed.contacts;
}

async function loadState() {
  // ── 1. Biometric gate (native context only) ──────────────
  if (_BiometricAuth) {
    let available = false;
    try {
      const check = await _BiometricAuth.isAvailable();
      available = !!(check && check.isAvailable);
    } catch (_) {}

    if (available) {
      try {
        await _BiometricAuth.verifyIdentity({
          reason:             'Verifica tu identidad para acceder a MediTime',
          title:              'MediTime PRO',
          subtitle:           'Autenticación requerida',
          description:        'Usa tu huella dactilar o Face ID para continuar',
          negativeButtonText: 'Cancelar',
          maxAttempts:        3,
        });
      } catch (bioErr) {
        const msg       = (bioErr && bioErr.message) || '';
        const isCancel  = /cancel/i.test(msg);
        const isLockout = /lockout|too many/i.test(msg);
        _showLockScreen(
          isLockout
            ? 'Demasiados intentos fallidos. Reinicia la aplicación.'
            : isCancel
              ? 'Autenticación cancelada. Toca "Reintentar" para continuar.'
              : 'No se pudo verificar la identidad. Inténtalo de nuevo.'
        );
        // Hard-halt: nothing renders until the user retries
        return;
      }
    }
  }

  // ── 2. TEE-backed secure storage (native) ────────────────
  if (_SecureStorage) {
    try {
      const result = await _SecureStorage.get({ key: STORAGE_KEY });
      if (result && result.value) _applyParsed(JSON.parse(result.value));
    } catch (e) {
      const notFound = e && /not found|no value/i.test(e.message || '');
      if (!notFound) showToast('Error al leer datos seguros', 'error');
      // KEY_NOT_FOUND on first launch is expected — defaults are used
    }
    return;
  }

  // ── 3. Browser / PWA localStorage shim ───────────────────
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _applyParsed(JSON.parse(raw));
  } catch (_) {
    // Corrupt storage — start fresh with defaults
  }
}

async function saveState() {
  const payload = JSON.stringify({
    medicines: state.medicines,
    history:   state.history,
    settings:  state.settings,
    profile:   state.profile,
    contacts:  state.contacts,
  });

  if (_SecureStorage) {
    try {
      await _SecureStorage.set({ key: STORAGE_KEY, value: payload });
    } catch (_) {
      showToast('Error al guardar datos', 'error');
    }
    return;
  }

  // Browser fallback
  try {
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (_) {
    showToast('Error al guardar datos', 'error');
  }
}

function pruneHistory() {
  const cutoff = Date.now() - HISTORY_DAYS * 86_400_000;
  state.history = state.history.filter(e => e.ts >= cutoff);
}

// ══════════════════════════════════════════════════════════
// AUDIO (Web Audio API — uses existing WAV files)
// ══════════════════════════════════════════════════════════
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
  }
  return audioCtx;
}

const audioCache = {};

async function playSound(name) {
  // name: 'confirmacion'|'error'|'normal'|'prealerta'|'suave'|'urgente'
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (!audioCache[name]) {
      const res = await fetch('assets/' + name + '.wav');
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      audioCache[name] = await ctx.decodeAudioData(buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = audioCache[name];
    src.connect(ctx.destination);
    src.start(0);
  } catch (_) {
    // audio not critical — silently fail
  }
}

// ══════════════════════════════════════════════════════════
// HAPTICS (navigator.vibrate — sin soporte falla en silencio)
// ══════════════════════════════════════════════════════════
const VIBRATE_PATTERNS = {
  confirm: 60,                          // toque corto: dosis confirmada
  alarm:   [300, 150, 300],             // alarma normal
  urgent:  [500, 200, 500, 200, 500],   // alarma urgente: patrón largo
  sos:     [400, 150, 400, 150, 400],   // emergencia activada
};

function vibrate(kind) {
  if (!('vibrate' in navigator)) return;
  try { navigator.vibrate(VIBRATE_PATTERNS[kind] || 0); } catch (_) {}
}

// ══════════════════════════════════════════════════════════
// TTS (Web Speech API)
// ══════════════════════════════════════════════════════════
function speak(text) {
  if (!state.settings.ttsEnabled) return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = 'es-ES';
  utt.rate  = 0.95;
  utt.pitch = 1.0;
  window.speechSynthesis.speak(utt);
}

// ══════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════
let toastTimer = null;
function showToast(msg, type /* 'success'|'error'|'warning' */ = '', action = null) {
  const el = document.getElementById('toast');
  if (!el) return;
  clearElement(el);
  el.appendChild(document.createTextNode(msg));

  // Botón de acción opcional (p. ej. "Deshacer"): el toast dura 5 s
  // en vez de 3.2 s para dar tiempo a pulsarlo.
  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.setAttribute('aria-label', action.ariaLabel || action.label);
    btn.addEventListener('click', () => {
      clearTimeout(toastTimer);
      el.classList.remove('show');
      action.onAction();
    });
    el.appendChild(btn);
  }

  el.className = 'toast' + (type ? ' ' + type : '') + ' show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5000 : 3200);
}

// ══════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════
const VIEWS = ['inicio','medicinas','sos','historial','ajustes'];

function navigateTo(view) {
  if (!VIEWS.includes(view)) return;

  // Salir de la pantalla SOS por cualquier vía detiene la cuenta atrás:
  // sin esto, la llamada de emergencia se haría aunque el usuario ya
  // hubiera cambiado a otra sección con la barra de navegación.
  if (currentView === 'sos' && view !== 'sos') clearSOS();

  // Hide all views
  VIEWS.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.hidden = true;
    el && el.removeAttribute('tabindex');
  });

  // Show target
  const target = document.getElementById('view-' + view);
  if (target) {
    target.hidden = false;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const active = btn.dataset.view === view;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  });

  currentView = view;

  // View-specific init
  if (view === 'inicio')    { resetDailyConfirmed(); renderInicio(); }
  if (view === 'medicinas') { renderMedicineList(); }
  if (view === 'sos')       { initSOS(); }
  if (view === 'historial') { renderHistory(); }
  if (view === 'ajustes')   { populateSettings(); }

  const viewNames = { inicio:'Inicio', medicinas:'Medicamentos', sos:'Emergencia', historial:'Historial', ajustes:'Ajustes' };
  speak(view === 'historial'
    ? historySummarySpeech()
    : 'Sección ' + (viewNames[view] || view));
}

// ══════════════════════════════════════════════════════════
// DAILY RESET
// ══════════════════════════════════════════════════════════
function todayStr() {
  return new Date().toDateString();
}

function resetDailyConfirmed() {
  const today = todayStr();
  state.medicines.forEach(med => {
    if (med.lastResetDate !== today) {
      med.confirmedToday = {};
      med.snoozedUntil   = {};
      med.lastResetDate  = today;
    }
  });
}

// ══════════════════════════════════════════════════════════
// GREET
// ══════════════════════════════════════════════════════════
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// ══════════════════════════════════════════════════════════
// INICIO VIEW
// ══════════════════════════════════════════════════════════
function renderInicio() {
  // Greeting
  const greetEl = document.getElementById('greeting-text');
  if (greetEl) greetEl.textContent = getGreeting();

  // Name
  const nameEl = document.getElementById('patient-name-display');
  if (nameEl) nameEl.textContent = state.profile.name ? state.profile.name : 'Mi Medicación';

  // Progress
  const todayMeds = getMedicinesForToday();
  const total  = todayMeds.reduce((s, m) => s + m.times.length, 0);
  const taken  = todayMeds.reduce((s, m) => s + m.times.filter(t => m.confirmedToday[t]).length, 0);
  const pct    = total === 0 ? 0 : Math.round((taken / total) * 100);

  const pctEl = document.getElementById('progress-percent');
  if (pctEl) pctEl.textContent = pct + '%';

  const summaryEl = document.getElementById('today-summary');
  if (summaryEl) {
    if (total === 0) {
      summaryEl.textContent = 'No hay medicamentos para hoy.';
    } else {
      summaryEl.textContent = 'Has tomado ' + taken + ' de ' + total + ' dosis hoy.';
    }
  }

  // Donut
  const circumference = 2 * Math.PI * 50; // r=50
  const offset = circumference - (pct / 100) * circumference;
  const donut = document.getElementById('donut-progress');
  if (donut) donut.style.strokeDashoffset = String(offset);

  // Next alarm
  renderNextAlarm(todayMeds);

  // Today's alarm rows
  renderTodayAlarms(todayMeds);
}

function renderNextAlarm(todayMeds) {
  const nextEl = document.getElementById('next-alarm-time');
  if (!nextEl) return;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  let next = null;
  todayMeds.forEach(med => {
    med.times.forEach(t => {
      if (med.confirmedToday[t]) return;
      const [h, m] = t.split(':').map(Number);
      const totalMin = h * 60 + m;
      if (totalMin >= nowMin) {
        if (!next || totalMin < next.totalMin) next = { time: t, totalMin };
      }
    });
  });

  nextEl.textContent = next ? next.time : 'Ninguna pendiente';
}

function renderTodayAlarms(todayMeds) {
  const container = document.getElementById('today-alarms');
  if (!container) return;
  container.innerHTML = '';

  const allAlarms = [];
  todayMeds.forEach(med => {
    med.times.forEach(t => {
      allAlarms.push({ med, time: t });
    });
  });
  allAlarms.sort((a, b) => a.time.localeCompare(b.time));

  if (allAlarms.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Sin medicamentos para hoy.';
    p.style.textAlign = 'center';
    p.style.color = 'var(--text-muted)';
    p.style.padding = '24px';
    container.appendChild(p);
    return;
  }

  allAlarms.forEach(({ med, time }) => {
    const row = document.createElement('div');
    row.className = 'alarm-row';

    const dot = document.createElement('div');
    dot.className = 'alarm-color-dot';
    dot.style.background = med.color;

    const info = document.createElement('div');
    info.className = 'alarm-info';

    const nameEl = document.createElement('p');
    nameEl.className = 'alarm-name';
    nameEl.textContent = med.name;

    const detail = document.createElement('p');
    detail.className = 'alarm-detail';
    detail.textContent = med.dose || FREQ_LABELS[med.frequency] || '';

    info.appendChild(nameEl);
    info.appendChild(detail);

    const timeEl = document.createElement('span');
    timeEl.className = 'alarm-time';
    timeEl.textContent = time;

    const statusEl = document.createElement('span');
    statusEl.className = 'alarm-status';
    statusEl.setAttribute('aria-hidden', 'true');
    statusEl.textContent = med.confirmedToday[time] ? '✅' : '⏳';

    row.appendChild(dot);
    row.appendChild(info);
    row.appendChild(timeEl);
    row.appendChild(statusEl);
    row.setAttribute('aria-label', med.name + ' a las ' + time + (med.confirmedToday[time] ? ' – tomado' : ' – pendiente'));

    container.appendChild(row);
  });
}

// ══════════════════════════════════════════════════════════
// WHICH MEDICINES ARE ACTIVE TODAY
// ══════════════════════════════════════════════════════════
function getMedicinesForToday() {
  const dow = new Date().getDay(); // 0=Sun,6=Sat
  const isWeekday = dow >= 1 && dow <= 5;
  const isWeekend = dow === 0 || dow === 6;

  return state.medicines.filter(med => {
    switch (med.frequency) {
      case 'diario':  return true;
      case 'semana':  return isWeekday;
      case 'finde':   return isWeekend;
      case 'alterno': {
        const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
        const created = Math.floor(med.createdAt / 86_400_000);
        return (daysSinceEpoch - created) % 2 === 0;
      }
      default: return true;
    }
  });
}

// ══════════════════════════════════════════════════════════
// REMINDER LOOP
// ══════════════════════════════════════════════════════════
function startReminderLoop() {
  checkReminders();
  reminderTimer = setInterval(checkReminders, REMINDER_INTERVAL_MS);

  // Also fire on visibility restore (catches missed alarms)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkReminders();
  });
}

function checkReminders() {
  resetDailyConfirmed();

  const today = todayStr();
  if (alarmAlertsDate !== today) { alarmAlerts = {}; alarmAlertsDate = today; }

  const nowTs = Date.now();

  // Si ya hay una alarma en pantalla no se tapa con otra:
  // la siguiente saldrá en cuanto se responda la actual.
  const modal = document.getElementById('alarm-modal');
  if (!modal || modal.hidden) {
    let next = null; // la dosis vencida más antigua pendiente de aviso

    getMedicinesForToday().forEach(med => {
      med.times.forEach(t => {
        if (med.confirmedToday[t]) return;

        const [h, m] = t.split(':').map(Number);
        const at = new Date();
        at.setHours(h, m, 0, 0);

        // Si está pospuesta, vence al acabar el aplazamiento
        const snoozedUntil = med.snoozedUntil && med.snoozedUntil[t];
        const dueTs = snoozedUntil || at.getTime();

        const late = nowTs - dueTs;
        if (late < 0 || late > ALARM_GRACE_MS) return; // aún no toca o ya muy tarde

        const key = med.id + '|' + t;
        if (nowTs - (alarmAlerts[key] || 0) < ALARM_REALERT_MS) return; // avisada hace poco

        if (!next || dueTs < next.dueTs) next = { med, time: t, dueTs, key };
      });
    });

    if (next) {
      alarmAlerts[next.key] = nowTs;
      triggerAlarm(next.med, next.time);
    }
  }

  // Also update dashboard if on inicio view
  if (currentView === 'inicio') renderInicio();
}

function pad(n) { return String(n).padStart(2, '0'); }

// ══════════════════════════════════════════════════════════
// NATIVE NOTIFICATIONS (suenan con la app cerrada)
// Se reprograman completas tras cada cambio en los medicamentos.
// ══════════════════════════════════════════════════════════
async function syncNativeNotifications() {
  if (!_LocalNotifications) return;
  try {
    let perm = await _LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await _LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;
    }

    const pending = await _LocalNotifications.getPending();
    if (pending && pending.notifications && pending.notifications.length) {
      await _LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id })),
      });
    }

    // El plugin numera los días: 1=domingo … 7=sábado
    const WEEKDAYS = { semana: [2, 3, 4, 5, 6], finde: [1, 7] };
    const toSchedule = [];
    let nextId = 1;

    state.medicines.forEach(med => {
      med.times.forEach(t => {
        const [hour, minute] = t.split(':').map(Number);
        const body = med.name + (med.dose ? ' · ' + med.dose : '') + ' a las ' + t;
        const days = WEEKDAYS[med.frequency];
        if (days) {
          days.forEach(weekday => {
            toSchedule.push({
              id: nextId++,
              title: '💊 MediTime — Hora de su medicina',
              body,
              schedule: { on: { weekday, hour, minute }, allowWhileIdle: true },
            });
          });
        } else {
          // 'diario' y 'alterno' se programan a diario; en los días que no
          // tocan ('alterno') la app abierta no muestra el modal
          toSchedule.push({
            id: nextId++,
            title: '💊 MediTime — Hora de su medicina',
            body,
            schedule: { on: { hour, minute }, allowWhileIdle: true },
          });
        }
      });
    });

    if (toSchedule.length) {
      await _LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch (_) {
    // Sin permiso o sin plugin: siguen funcionando los recordatorios web
  }
}

// ══════════════════════════════════════════════════════════
// ALARM TRIGGER
// ══════════════════════════════════════════════════════════
function triggerAlarm(med, time) {
  const soundName = med.priority === 'urgente' ? 'urgente' : 'normal';
  playSound(soundName);
  vibrate(med.priority === 'urgente' ? 'urgent' : 'alarm');

  speak('Atención. Hora de tomar ' + med.name + '. ' + (med.dose || '') + '. ' + (med.notes || ''));

  showAlarmModal(med, time);

  // Web Notification
  if (state.settings.notifEnabled && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('💊 MediTime — Hora de su medicina', {
        body: med.name + (med.dose ? ' · ' + med.dose : '') + ' a las ' + time,
        icon: 'icons/icon-192.png',
        tag:  'meditime-alarm-' + med.id,
        renotify: true,
      });
    } catch (_) {}
  }
}

// ══════════════════════════════════════════════════════════
// ALARM MODAL
// ══════════════════════════════════════════════════════════
let alarmModalMed  = null;
let alarmModalTime = null;

function showAlarmModal(med, time) {
  alarmModalMed  = med;
  alarmModalTime = time;

  const modal   = document.getElementById('alarm-modal');
  const titleEl = document.getElementById('alarm-modal-title');
  const bodyEl  = document.getElementById('alarm-modal-body');
  const notesEl = document.getElementById('alarm-modal-notes');

  if (!modal) return;

  if (titleEl) titleEl.textContent = '¡Hora de tomar su medicina!';
  if (bodyEl)  bodyEl.textContent  = med.name + (med.dose ? ' — ' + med.dose : '');
  if (notesEl) notesEl.textContent = med.notes || '';

  modal.hidden = false;
  modal.querySelector('.modal-box').focus();
}

function closeAlarmModal() {
  const modal = document.getElementById('alarm-modal');
  if (modal) modal.hidden = true;
  alarmModalMed  = null;
  alarmModalTime = null;
}

function confirmDose() {
  if (!alarmModalMed || !alarmModalTime) return;
  const med   = alarmModalMed;
  const time  = alarmModalTime;
  const entry = createHistoryEntry(med.id, med.name, time, 'taken');

  med.confirmedToday[time] = true;
  state.history.unshift(entry);
  pruneHistory();
  saveState();
  playSound('confirmacion');
  vibrate('confirm');
  speak('Excelente. Medicamento confirmado. Que se mejore.');
  // Se guarda al instante (si la app se cierra, la toma no se pierde) y
  // "Deshacer" revierte: quita la marca del día y el registro del historial.
  showToast('¡' + med.name + ' registrado!', 'success', {
    label:     'Deshacer',
    ariaLabel: 'Deshacer la confirmación de ' + med.name,
    onAction:  () => undoConfirmDose(med.id, time, entry.id),
  });
  closeAlarmModal();
  if (currentView === 'inicio') renderInicio();
}

function undoConfirmDose(medId, time, entryId) {
  const med = state.medicines.find(m => m.id === medId);
  if (med && med.confirmedToday) delete med.confirmedToday[time];
  state.history = state.history.filter(e => e.id !== entryId);
  saveState();
  speak('Confirmación deshecha. La alarma volverá a avisar.');
  showToast('Confirmación deshecha', 'warning');
  if (currentView === 'inicio')    renderInicio();
  if (currentView === 'historial') renderHistory();
}

function snoozeDose() {
  if (!alarmModalMed || !alarmModalTime) return;
  const minutes = state.settings.snoozeMinutes;
  if (!alarmModalMed.snoozedUntil) alarmModalMed.snoozedUntil = {};
  alarmModalMed.snoozedUntil[alarmModalTime] = Date.now() + minutes * 60_000;
  state.history.unshift(createHistoryEntry(alarmModalMed.id, alarmModalMed.name, alarmModalTime, 'snoozed'));
  pruneHistory();
  saveState();
  // Aviso nativo único al vencer el aplazamiento (suena con app cerrada)
  if (_LocalNotifications) {
    _LocalNotifications.schedule({
      notifications: [{
        id:    900000 + Math.floor(Math.random() * 90000),
        title: '💊 MediTime — Dosis pospuesta',
        body:  alarmModalMed.name + (alarmModalMed.dose ? ' · ' + alarmModalMed.dose : ''),
        schedule: { at: new Date(Date.now() + minutes * 60_000), allowWhileIdle: true },
      }],
    }).catch(() => {});
  }
  playSound('suave');
  speak('Alarma pospuesta ' + minutes + ' minutos.');
  showToast('Pospuesto ' + minutes + ' min', 'warning');
  closeAlarmModal();
}

function skipDose() {
  if (!alarmModalMed || !alarmModalTime) return;
  alarmModalMed.confirmedToday[alarmModalTime] = true; // mark so it stops alerting
  state.history.unshift(createHistoryEntry(alarmModalMed.id, alarmModalMed.name, alarmModalTime, 'skipped'));
  pruneHistory();
  saveState();
  playSound('error');
  speak('Dosis omitida.');
  showToast('Dosis omitida', 'error');
  closeAlarmModal();
  if (currentView === 'inicio') renderInicio();
}

// ══════════════════════════════════════════════════════════
// MEDICINE LIST VIEW
// ══════════════════════════════════════════════════════════
function renderMedicineList() {
  const container = document.getElementById('med-list-container');
  if (!container) return;
  container.innerHTML = '';

  if (state.medicines.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '💊';
    const p = document.createElement('p');
    p.textContent = 'Sin medicamentos guardados. Toca ＋ para agregar.';
    empty.appendChild(icon);
    empty.appendChild(p);
    container.appendChild(empty);
    return;
  }

  // Sort by first time
  const sorted = [...state.medicines].sort((a, b) => {
    const ta = a.times[0] || '99:99';
    const tb = b.times[0] || '99:99';
    return ta.localeCompare(tb);
  });

  sorted.forEach(med => {
    const card = document.createElement('div');
    card.className = 'med-card';
    card.setAttribute('aria-label', med.name + (med.dose ? ', ' + med.dose : ''));

    // Accent bar
    const accent = document.createElement('div');
    accent.className = 'med-card-accent';
    accent.style.background = med.color;

    // Body
    const body = document.createElement('div');
    body.className = 'med-card-body';

    const nameEl = document.createElement('p');
    nameEl.className = 'med-card-name';
    nameEl.textContent = med.name;

    const doseEl = document.createElement('p');
    doseEl.className = 'med-card-dose';
    doseEl.textContent = (med.dose || '') + (med.dose && med.notes ? ' · ' : '') + (med.notes || '');

    const timesRow = document.createElement('div');
    timesRow.className = 'med-card-times';
    med.times.forEach(t => {
      const badge = document.createElement('span');
      badge.className = 'med-time-badge';
      badge.textContent = t;
      timesRow.appendChild(badge);
    });
    if (med.priority === 'urgente') {
      const urgBadge = document.createElement('span');
      urgBadge.className = 'urgente-badge';
      urgBadge.textContent = '🚨 Urgente';
      timesRow.appendChild(urgBadge);
    }

    body.appendChild(nameEl);
    body.appendChild(doseEl);
    body.appendChild(timesRow);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'med-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.setAttribute('aria-label', 'Editar ' + med.name);
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => openEditForm(med.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon danger';
    delBtn.setAttribute('aria-label', 'Eliminar ' + med.name);
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', () => deleteMedicine(med.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(accent);
    card.appendChild(body);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

// ── Add/Edit Form ──
let formTimes = []; // temp times while editing form

function openAddForm() {
  editMedId = null;
  formTimes = [];

  const titleEl = document.getElementById('form-title');
  if (titleEl) titleEl.textContent = 'Agregar Medicamento';

  clearForm();
  renderTimesInForm();
  showFormPanel();
  speak('Agregar medicamento. Completa el formulario.');
}

function openEditForm(id) {
  const med = state.medicines.find(m => m.id === id);
  if (!med) return;
  editMedId = id;
  formTimes = [...med.times];

  const titleEl = document.getElementById('form-title');
  if (titleEl) titleEl.textContent = 'Editar Medicamento';

  const nameEl     = document.getElementById('f-name');
  const doseEl     = document.getElementById('f-dose');
  const notesEl    = document.getElementById('f-notes');
  const freqEl     = document.getElementById('f-freq');
  const priorityEl = document.getElementById('f-priority');

  if (nameEl)     nameEl.value     = med.name;
  if (doseEl)     doseEl.value     = med.dose;
  if (notesEl)    notesEl.value    = med.notes;
  if (freqEl)     freqEl.value     = med.frequency;
  if (priorityEl) priorityEl.value = med.priority;

  // Color
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('selected', sw.dataset.color === med.color);
  });

  renderTimesInForm();
  showFormPanel();
  speak('Editando ' + med.name + '.');
}

function showFormPanel() {
  const panel = document.getElementById('med-form-panel');
  if (panel) {
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function hideFormPanel() {
  const panel = document.getElementById('med-form-panel');
  if (panel) panel.hidden = true;
  clearForm();
}

function clearForm() {
  const form = document.getElementById('med-form');
  if (form) form.reset();
  document.getElementById('edit-med-id') && (document.getElementById('edit-med-id').value = '');
  formTimes = [];
  document.querySelectorAll('.color-swatch').forEach((sw, i) => {
    sw.classList.toggle('selected', i === 0);
  });
  renderTimesInForm();
}

function renderTimesInForm() {
  const container = document.getElementById('times-container');
  if (!container) return;
  container.innerHTML = '';

  formTimes.forEach((t, idx) => {
    const chip = document.createElement('div');
    chip.className = 'time-chip';

    const timeInput = document.createElement('input');
    timeInput.type  = 'time';
    timeInput.value = t;
    timeInput.style.border = 'none';
    timeInput.style.background = 'transparent';
    timeInput.style.padding = '0';
    timeInput.style.minHeight = 'unset';
    timeInput.style.width = '90px';
    timeInput.setAttribute('aria-label', 'Hora ' + (idx + 1));
    timeInput.addEventListener('change', e => { formTimes[idx] = e.target.value; });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', 'Eliminar hora ' + t);
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => {
      formTimes.splice(idx, 1);
      renderTimesInForm();
    });

    chip.appendChild(timeInput);
    chip.appendChild(removeBtn);
    container.appendChild(chip);
  });
}

function addTimeToForm() {
  const now = new Date();
  const t = pad(now.getHours()) + ':' + pad(now.getMinutes());
  formTimes.push(t);
  renderTimesInForm();
  speak('Horario agregado: ' + t + '.');
}

function saveMedicineForm(e) {
  e.preventDefault();

  const name     = sanitize(document.getElementById('f-name')?.value     || '');
  const dose     = sanitize(document.getElementById('f-dose')?.value     || '');
  const notes    = sanitize(document.getElementById('f-notes')?.value    || '');
  const freq     = document.getElementById('f-freq')?.value    || 'diario';
  const priority = document.getElementById('f-priority')?.value || 'normal';
  const selected = document.querySelector('.color-swatch.selected');
  const color    = selected ? selected.dataset.color : TAG_COLORS[0];

  if (!name) {
    showToast('Ingresa el nombre del medicamento', 'error');
    speak('El nombre es obligatorio.');
    return;
  }
  if (formTimes.length === 0) {
    showToast('Agrega al menos un horario', 'error');
    speak('Debes agregar al menos un horario.');
    return;
  }

  if (editMedId) {
    // Edit existing
    const med = state.medicines.find(m => m.id === editMedId);
    if (med) {
      med.name      = name;
      med.dose      = dose;
      med.notes     = notes;
      med.times     = [...formTimes].sort();
      med.frequency = freq;
      med.priority  = priority;
      med.color     = color;
    }
    showToast(name + ' actualizado', 'success');
    speak(name + ' actualizado correctamente.');
  } else {
    // New
    const med = createMedicine({ name, dose, notes, times: [...formTimes].sort(), frequency: freq, priority, color });
    state.medicines.push(med);
    showToast(name + ' guardado', 'success');
    speak(name + ' guardado correctamente.');
    playSound('confirmacion');
  }

  saveState();
  syncNativeNotifications();
  editMedId = null;
  hideFormPanel();
  renderMedicineList();
}

function deleteMedicine(id) {
  const med = state.medicines.find(m => m.id === id);
  if (!med) return;
  if (!confirm('¿Eliminar ' + med.name + '? Esta acción no se puede deshacer.')) return;
  state.medicines = state.medicines.filter(m => m.id !== id);
  saveState();
  syncNativeNotifications();
  playSound('error');
  showToast(med.name + ' eliminado', 'warning');
  speak(med.name + ' eliminado.');
  renderMedicineList();
  if (currentView === 'inicio') renderInicio();
}

// ══════════════════════════════════════════════════════════
// SOS VIEW
// ══════════════════════════════════════════════════════════
// El SOS solo se activa manteniendo pulsado el botón SOS_HOLD_MS.
// Un toque corto muestra una pista en vez de iniciar la cuenta atrás,
// para evitar llamadas de emergencia accidentales.
function setupSOSLongPress() {
  const btn = document.querySelector('.nav-btn.nav-sos');
  if (!btn) return;

  const startHold = () => {
    if (sosHoldTimer) return;
    btn.classList.add('holding');
    sosHoldTimer = setTimeout(() => {
      sosHoldTimer = null;
      btn.classList.remove('holding');
      navigateTo('sos');
    }, SOS_HOLD_MS);
  };

  const cancelHold = (showHint) => {
    if (!sosHoldTimer) return;          // ya activado o nunca iniciado
    clearTimeout(sosHoldTimer);
    sosHoldTimer = null;
    btn.classList.remove('holding');
    if (showHint) {
      showToast('Mantén pulsado SOS 2 segundos para activar', 'warning');
      speak('Para activar la emergencia, mantén pulsado el botón SOS durante dos segundos.');
    }
  };

  // Táctil y ratón
  btn.addEventListener('pointerdown',   e => { e.preventDefault(); startHold(); });
  btn.addEventListener('pointerup',     () => cancelHold(true));
  btn.addEventListener('pointerleave',  () => cancelHold(false));
  btn.addEventListener('pointercancel', () => cancelHold(false));

  // La pulsación larga en Android dispara el menú contextual: bloquearlo
  btn.addEventListener('contextmenu', e => e.preventDefault());

  // Teclado: mantener Enter o Espacio los 2 segundos
  btn.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
      e.preventDefault();
      startHold();
    }
  });
  btn.addEventListener('keyup', e => {
    if (e.key === 'Enter' || e.key === ' ') cancelHold(true);
  });
  btn.addEventListener('blur', () => cancelHold(false));

  // El click sintético posterior al pointerup no debe navegar
  btn.addEventListener('click', e => e.preventDefault());
}

function initSOS() {
  clearSOS();
  vibrate('sos');
  getGPS();
  startSOSCountdown();
  speak('Modo de emergencia activado. Obteniendo ubicación. Llame si necesita ayuda.');
}

function getGPS() {
  const box = document.getElementById('sos-location');
  if (!box) return;
  clearElement(box);
  box.textContent = '📡 Obteniendo señal GPS…';

  if (!navigator.geolocation) {
    box.textContent = 'GPS no disponible en este dispositivo.';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(5);
      const lng = pos.coords.longitude.toFixed(5);
      const acc = Math.round(pos.coords.accuracy);

      clearElement(box);

      const latLine  = document.createElement('div');
      latLine.textContent = 'LAT: ' + lat;
      const lngLine  = document.createElement('div');
      lngLine.textContent = 'LON: ' + lng;
      const accLine  = document.createElement('div');
      accLine.style.fontSize = '0.8em';
      accLine.style.opacity  = '0.7';
      accLine.textContent    = 'Precisión: ±' + acc + ' m';

      box.appendChild(latLine);
      box.appendChild(lngLine);
      box.appendChild(accLine);

      speak('Ubicación obtenida. Latitud ' + lat + '. Longitud ' + lng);
    },
    err => {
      const msgs = {
        1: 'Permiso de ubicación denegado.',
        2: 'Señal GPS no disponible.',
        3: 'Tiempo de espera agotado.',
      };
      const msg = (msgs[err.code] || 'Error GPS desconocido.') + ' Active la ubicación del dispositivo.';
      box.textContent = msg;
      speak(msg);
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function startSOSCountdown() {
  let count = 10;
  const countEl  = document.getElementById('sos-countdown');
  const statusEl = document.getElementById('sos-status');

  const updateUI = () => {
    if (countEl)  countEl.textContent  = count;
    if (statusEl) statusEl.textContent = 'Llamando en ' + count + ' segundo' + (count !== 1 ? 's' : '') + '…';
  };
  updateUI();

  sosTimerID = setInterval(() => {
    count--;
    updateUI();
    // Cuenta atrás hablada en la recta final (el "0" lo anuncia makeSOSCall)
    if (count >= 1 && count <= 3) speak(String(count));
    if (count <= 0) {
      clearInterval(sosTimerID);
      makeSOSCall();
    }
  }, 1000);
}

function makeSOSCall() {
  const num = sanitizePhone(state.settings.sosNumber) || '911';
  const statusEl = document.getElementById('sos-status');
  if (statusEl) statusEl.textContent = '¡Marcando ' + num + '!';
  speak('Llamando a emergencias ahora.');
  const btn = document.getElementById('sos-call-btn');
  if (btn) btn.href = 'tel:' + num;
  window.location.href = 'tel:' + num;
}

function cancelSOS() {
  clearSOS();
  speak('Emergencia cancelada.');
  showToast('Emergencia cancelada', 'warning');
  navigateTo('inicio');
}

function clearSOS() {
  clearInterval(sosTimerID);
  sosTimerID = null;
  const countEl  = document.getElementById('sos-countdown');
  const statusEl = document.getElementById('sos-status');
  if (countEl)  countEl.textContent  = '—';
  if (statusEl) statusEl.textContent = '';
}

// ══════════════════════════════════════════════════════════
// HISTORY VIEW
// ══════════════════════════════════════════════════════════
function renderHistory() {
  renderHistoryStats();
  renderHistoryList();
}

// Texto TTS del resumen de adherencia, anunciado al entrar al Historial.
// Devuelve la frase completa (incluido "Sección Historial") para que
// navigateTo la locute en un solo anuncio, sin cortes.
function historySummarySpeech() {
  const taken   = state.history.filter(e => e.action === 'taken').length;
  const skipped = state.history.filter(e => e.action === 'skipped').length;
  const snoozed = state.history.filter(e => e.action === 'snoozed').length;

  if (taken + skipped + snoozed === 0) {
    return 'Sección Historial. Aún no hay registros.';
  }
  return 'Sección Historial. En los últimos ' + HISTORY_DAYS + ' días: ' +
         taken + ' tomadas, ' + skipped + ' omitidas, ' + snoozed + ' pospuestas.';
}

function renderHistoryStats() {
  const container = document.getElementById('history-stats');
  if (!container) return;
  container.innerHTML = '';

  const taken   = state.history.filter(e => e.action === 'taken').length;
  const skipped = state.history.filter(e => e.action === 'skipped').length;
  const snoozed = state.history.filter(e => e.action === 'snoozed').length;

  const stats = [
    { value: taken,   label: 'Tomadas',   color: 'var(--success)' },
    { value: skipped, label: 'Omitidas',  color: 'var(--danger)'  },
    { value: snoozed, label: 'Pospuestas', color: 'var(--warning)' },
  ];

  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    const val = document.createElement('span');
    val.className = 'stat-value';
    val.style.color = s.color;
    val.textContent = String(s.value);
    const lbl = document.createElement('span');
    lbl.className = 'stat-label';
    lbl.textContent = s.label;
    card.appendChild(val);
    card.appendChild(lbl);
    container.appendChild(card);
  });
}

function renderHistoryList() {
  const container = document.getElementById('history-list');
  if (!container) return;
  container.innerHTML = '';

  if (state.history.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No hay registros aún.';
    p.style.textAlign = 'center';
    p.style.color = 'var(--text-muted)';
    p.style.padding = '32px';
    container.appendChild(p);
    return;
  }

  const icons   = { taken: '✅', skipped: '❌', snoozed: '⏰' };
  const actions = { taken: 'Tomado', skipped: 'Omitido', snoozed: 'Pospuesto' };

  state.history.slice(0, 60).forEach(entry => {
    const row = document.createElement('div');
    row.className = 'history-entry';
    row.setAttribute('aria-label', entry.medName + ' ' + (actions[entry.action] || entry.action));

    const icon = document.createElement('span');
    icon.className = 'history-status-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = icons[entry.action] || '•';

    const body = document.createElement('div');
    body.className = 'history-body';

    const name = document.createElement('p');
    name.className = 'history-med-name';
    name.textContent = entry.medName;

    const meta = document.createElement('p');
    meta.className = 'history-meta';
    meta.textContent = (actions[entry.action] || entry.action) + ' · ' + entry.time;

    body.appendChild(name);
    body.appendChild(meta);

    const ts = document.createElement('div');
    ts.className = 'history-time';
    const d = new Date(entry.ts);
    ts.textContent = d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + '\n' +
                     d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    ts.style.whiteSpace = 'pre';

    row.appendChild(icon);
    row.appendChild(body);
    row.appendChild(ts);
    container.appendChild(row);
  });
}

// ── Compartir con el médico (imprimir / guardar PDF) ──
// Construye el encabezado del informe con textContent (sin innerHTML
// con datos del usuario) y abre el diálogo nativo de impresión, desde
// el que también se puede guardar como PDF y compartir.
function buildPrintHeader() {
  const header = document.getElementById('print-header');
  if (!header) return;
  clearElement(header);

  const title = document.createElement('h1');
  title.textContent = '💊 MediTime — Informe de medicación';
  header.appendChild(title);

  const lines = [];
  if (state.profile.name) {
    lines.push('Paciente: ' + state.profile.name +
      (state.profile.age ? ' (' + state.profile.age + ' años)' : ''));
  }
  if (state.profile.doctorName) lines.push('Médico: ' + state.profile.doctorName);
  lines.push('Periodo: últimos ' + HISTORY_DAYS + ' días');
  lines.push('Generado: ' + new Date().toLocaleDateString('es',
    { day: '2-digit', month: 'long', year: 'numeric' }));

  lines.forEach(l => {
    const p = document.createElement('p');
    p.textContent = l;
    header.appendChild(p);
  });
}

function shareWithDoctor() {
  buildPrintHeader();
  speak('Abriendo el informe para compartir con su médico.');
  window.print();
}

// ══════════════════════════════════════════════════════════
// SETTINGS VIEW
// ══════════════════════════════════════════════════════════
function populateSettings() {
  setInput('s-patient-name',  state.profile.name);
  setInput('s-patient-age',   state.profile.age);
  setInput('s-doctor-name',   state.profile.doctorName);
  setInput('s-doctor-phone',  state.profile.doctorPhone);
  setInput('s-sos-number',    state.settings.sosNumber);
  setSelectValue('s-snooze-time', String(state.settings.snoozeMinutes));

  setToggle('s-tts-toggle',      state.settings.ttsEnabled);
  setToggle('s-contrast-toggle', state.settings.highContrast);
  setToggle('s-bigfont-toggle',  state.settings.bigFont);
  setToggle('s-dark-toggle',     state.settings.darkMode);
  setToggle('s-doubletap-toggle',state.settings.doubleTap);
  setToggle('s-notif-toggle',    state.settings.notifEnabled);

  renderContacts();
}

function setInput(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}
function setSelectValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function setToggle(id, checked) {
  const el = document.getElementById(id);
  if (el) el.setAttribute('aria-checked', checked ? 'true' : 'false');
}

function saveSettings() {
  state.profile.name        = sanitize(document.getElementById('s-patient-name')?.value  || '');
  state.profile.age         = sanitize(document.getElementById('s-patient-age')?.value   || '');
  state.profile.doctorName  = sanitize(document.getElementById('s-doctor-name')?.value  || '');
  state.profile.doctorPhone = sanitize(document.getElementById('s-doctor-phone')?.value || '');
  state.settings.sosNumber  = sanitizePhone(document.getElementById('s-sos-number')?.value) || '911';
  state.settings.snoozeMinutes = parseInt(document.getElementById('s-snooze-time')?.value || '10', 10);

  state.settings.ttsEnabled   = getToggle('s-tts-toggle');
  state.settings.highContrast = getToggle('s-contrast-toggle');
  state.settings.bigFont      = getToggle('s-bigfont-toggle');
  state.settings.darkMode     = getToggle('s-dark-toggle');
  state.settings.doubleTap    = getToggle('s-doubletap-toggle');
  state.settings.notifEnabled = getToggle('s-notif-toggle');

  applySettings();
  saveState();
  showToast('Ajustes guardados', 'success');
  speak('Ajustes guardados correctamente.');

  // Request notification permission if enabled
  if (state.settings.notifEnabled && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') {
        state.settings.notifEnabled = false;
        setToggle('s-notif-toggle', false);
        saveState();
        showToast('Permiso de notificaciones denegado', 'error');
      }
    });
  }
}

function getToggle(id) {
  const el = document.getElementById(id);
  return el ? el.getAttribute('aria-checked') === 'true' : false;
}

function applySettings() {
  document.body.classList.toggle('high-contrast', state.settings.highContrast);
  document.body.classList.toggle('big-font',      state.settings.bigFont);
  document.body.classList.toggle('dark-mode',     state.settings.darkMode);

  const ttsBtn = document.getElementById('btn-tts');
  if (ttsBtn) ttsBtn.setAttribute('aria-pressed', state.settings.ttsEnabled ? 'true' : 'false');
}

// ── Contacts ──
function renderContacts() {
  const list = document.getElementById('contacts-list');
  if (!list) return;
  list.innerHTML = '';

  if (state.contacts.length === 0) {
    const p = document.createElement('p');
    p.style.color = 'var(--text-muted)';
    p.style.fontSize = '0.88rem';
    p.textContent = 'Sin contactos de emergencia.';
    list.appendChild(p);
    return;
  }

  state.contacts.forEach(c => {
    const row = document.createElement('div');
    row.className = 'contact-item';
    row.setAttribute('aria-label', c.name + ', ' + c.phone);

    const info = document.createElement('div');
    info.className = 'contact-info';
    const name = document.createElement('p');
    name.className = 'contact-name';
    name.textContent = c.name;
    const phone = document.createElement('p');
    phone.className = 'contact-phone';
    phone.textContent = c.phone;
    info.appendChild(name);
    info.appendChild(phone);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon danger';
    delBtn.setAttribute('aria-label', 'Eliminar contacto ' + c.name);
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', () => removeContact(c.id));

    row.appendChild(info);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

function addContact() {
  const nameEl  = document.getElementById('s-contact-name');
  const phoneEl = document.getElementById('s-contact-phone');
  const name    = sanitize(nameEl?.value || '');
  const phone   = sanitize(phoneEl?.value || '');
  if (!name || !phone) {
    showToast('Ingresa nombre y teléfono del contacto', 'error');
    return;
  }
  state.contacts.push({ id: String(Date.now()), name, phone });
  saveState();
  if (nameEl)  nameEl.value  = '';
  if (phoneEl) phoneEl.value = '';
  renderContacts();
  showToast(name + ' agregado', 'success');
  speak(name + ' agregado como contacto de emergencia.');
}

function removeContact(id) {
  const c = state.contacts.find(x => x.id === id);
  if (!c) return;
  if (!confirm('¿Eliminar el contacto ' + c.name + '?')) return;
  state.contacts = state.contacts.filter(x => x.id !== id);
  saveState();
  renderContacts();
  showToast(c.name + ' eliminado', 'warning');
}

async function clearAllData() {
  if (!confirm('¿Borrar TODOS los datos de MediTime? Esta acción no se puede deshacer.')) return;
  if (!confirm('Confirme: ¿está seguro de eliminar todos los medicamentos e historial?')) return;

  if (_SecureStorage) {
    try { await _SecureStorage.remove({ key: STORAGE_KEY }); } catch (_) {}
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }

  showToast('Datos eliminados. Recargando…', 'warning');
  setTimeout(() => location.reload(), 1500);
}

// ══════════════════════════════════════════════════════════
// DOUBLE-TAP ACCESSIBILITY
// ══════════════════════════════════════════════════════════
function setupDoubleTap() {
  document.addEventListener('click', e => {
    if (!state.settings.doubleTap) return;

    // Never intercept toggles, checkboxes, or their labels
    if (e.target.closest('#s-doubletap-toggle, #s-tts-toggle, input[type="checkbox"], .nav-sos')) return;

    const target = e.target.closest('button, a[href], input[type="submit"]');
    if (!target) return;

    const now = Date.now();
    if (doubleTapState.el === target && now - doubleTapState.ts < 2000) {
      // Second tap — allow action naturally (do nothing, it fires)
      doubleTapState.el = null;
    } else {
      // First tap — announce and block
      e.preventDefault();
      e.stopImmediatePropagation();
      const label = target.getAttribute('aria-label') || target.textContent.trim().slice(0, 40) || 'Botón';
      speak(label + '. Toca dos veces para activar.');
      showToast(label.slice(0, 40) + ' — toca dos veces', '');
      doubleTapState = { el: target, ts: now };
    }
  }, true);
}

// ══════════════════════════════════════════════════════════
// CLOCK
// ══════════════════════════════════════════════════════════
function startClock() {
  const tick = () => {
    const el = document.getElementById('top-clock');
    if (!el) return;
    const now = new Date();
    el.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
  };
  tick();
  setInterval(tick, 30_000);
}

// ══════════════════════════════════════════════════════════
// COLOR PICKER BUILD
// ══════════════════════════════════════════════════════════
function buildColorPicker() {
  const container = document.getElementById('f-color');
  if (!container) return;
  container.innerHTML = '';

  TAG_COLORS.forEach((color, i) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch' + (i === 0 ? ' selected' : '');
    swatch.style.background = color;
    swatch.dataset.color = color;
    swatch.setAttribute('aria-label', 'Color ' + (i + 1));
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
    container.appendChild(swatch);
  });
}

// ══════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════
function sanitize(str) {
  // Remove potentially dangerous characters; keep alphanumeric, spaces, accented chars, common punctuation
  return str.replace(/[<>&"'`]/g, '').trim();
}

function sanitizePhone(str) {
  // Solo caracteres que un marcador telefónico entiende
  return String(str || '').replace(/[^\d+*#]/g, '');
}

function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ══════════════════════════════════════════════════════════
// EVENT WIRING
// ══════════════════════════════════════════════════════════
function wireEvents() {
  // Bottom nav
  // El botón SOS se excluye: requiere pulsación larga (setupSOSLongPress)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.classList.contains('nav-sos')) return;
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });
  setupSOSLongPress();

  // TTS toggle in top bar
  const ttsBtn = document.getElementById('btn-tts');
  if (ttsBtn) {
    ttsBtn.addEventListener('click', () => {
      state.settings.ttsEnabled = !state.settings.ttsEnabled;
      ttsBtn.setAttribute('aria-pressed', state.settings.ttsEnabled ? 'true' : 'false');
      saveState();
      speak(state.settings.ttsEnabled ? 'Voz activada.' : '');
      showToast('Voz ' + (state.settings.ttsEnabled ? 'activada' : 'desactivada'), '');
    });
  }

  // Add medicine button
  const btnAddMed = document.getElementById('btn-add-med');
  if (btnAddMed) btnAddMed.addEventListener('click', openAddForm);

  // Cancel form
  const btnCancel = document.getElementById('btn-cancel-form');
  if (btnCancel) btnCancel.addEventListener('click', () => { speak('Formulario cancelado.'); hideFormPanel(); });

  // Add time button
  const btnAddTime = document.getElementById('btn-add-time');
  if (btnAddTime) btnAddTime.addEventListener('click', addTimeToForm);

  // Medicine form submit
  const medForm = document.getElementById('med-form');
  if (medForm) medForm.addEventListener('submit', saveMedicineForm);

  // Alarm modal buttons
  const btnTaken  = document.getElementById('btn-modal-taken');
  const btnSnooze = document.getElementById('btn-modal-snooze');
  const btnSkip   = document.getElementById('btn-modal-skip');
  if (btnTaken)  btnTaken.addEventListener('click', confirmDose);
  if (btnSnooze) btnSnooze.addEventListener('click', snoozeDose);
  if (btnSkip)   btnSkip.addEventListener('click', skipDose);

  // SOS cancel
  const btnCancelSOS = document.getElementById('btn-cancel-sos');
  if (btnCancelSOS) btnCancelSOS.addEventListener('click', cancelSOS);

  // SOS call button — update href dynamically
  const sosCallBtn = document.getElementById('sos-call-btn');
  if (sosCallBtn) sosCallBtn.addEventListener('click', () => {
    sosCallBtn.href = 'tel:' + (sanitizePhone(state.settings.sosNumber) || '911');
  });

  // Settings — toggle buttons
  // Cada toggle se aplica y se guarda AL INSTANTE: el usuario ve el efecto
  // (modo oscuro, letra grande…) en el momento del toque, sin "Guardar ajustes".
  const toggleConfig = {
    's-tts-toggle':       { key: 'ttsEnabled',   on: 'Voz activada.',             off: 'Voz desactivada.' },
    's-contrast-toggle':  { key: 'highContrast', on: 'Alto contraste activado.',  off: 'Alto contraste desactivado.' },
    's-bigfont-toggle':   { key: 'bigFont',      on: 'Letra grande activada.',    off: 'Letra grande desactivada.' },
    's-dark-toggle':      { key: 'darkMode',     on: 'Modo oscuro activado.',     off: 'Modo oscuro desactivado.' },
    's-doubletap-toggle': { key: 'doubleTap',    on: 'Doble toque activado.',     off: 'Doble toque desactivado.' },
    's-notif-toggle':     { key: 'notifEnabled', on: 'Notificaciones activadas.', off: 'Notificaciones desactivadas.' },
  };
  Object.keys(toggleConfig).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      const cfg  = toggleConfig[id];
      const next = el.getAttribute('aria-checked') !== 'true';
      el.setAttribute('aria-checked', next ? 'true' : 'false');

      // La Voz se enciende ANTES de hablar para que su propio anuncio se oiga;
      // al desactivarla, se habla primero y se apaga después.
      if (cfg.key === 'ttsEnabled' && next) state.settings.ttsEnabled = true;
      speak(next ? cfg.on : cfg.off);

      state.settings[cfg.key] = next;
      applySettings();
      saveState();

      // Al activar notificaciones, pedir el permiso en ese momento
      if (cfg.key === 'notifEnabled' && next && _LocalNotifications) {
        syncNativeNotifications();
      } else if (cfg.key === 'notifEnabled' && next &&
          'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          if (perm !== 'granted') {
            state.settings.notifEnabled = false;
            setToggle('s-notif-toggle', false);
            saveState();
            showToast('Permiso de notificaciones denegado', 'error');
          }
        });
      }
    });
  });

  // Settings save
  const btnSave = document.getElementById('btn-save-settings');
  if (btnSave) btnSave.addEventListener('click', saveSettings);

  // Clear data
  const btnClear = document.getElementById('btn-clear-data');
  if (btnClear) btnClear.addEventListener('click', clearAllData);

  // Add contact
  const btnAddContact = document.getElementById('btn-add-contact');
  if (btnAddContact) btnAddContact.addEventListener('click', addContact);

  // Compartir historial con el médico
  const btnShareDoctor = document.getElementById('btn-share-doctor');
  if (btnShareDoctor) btnShareDoctor.addEventListener('click', shareWithDoctor);

  // Keyboard: close modal on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('alarm-modal');
      if (modal && !modal.hidden) closeAlarmModal();
    }
  });
}

// ══════════════════════════════════════════════════════════
// PWA SHORTCUTS (manifest.json → ?shortcut=add | ?shortcut=sos)
// ══════════════════════════════════════════════════════════
function handleShortcut() {
  let action = null;
  try {
    action = new URLSearchParams(window.location.search).get('shortcut');
  } catch (_) {}
  if (!action) return;

  // Quitar el parámetro de la URL: si el usuario recarga la app,
  // no debe re-dispararse el SOS ni reabrirse el formulario.
  try {
    history.replaceState(null, '', window.location.pathname);
  } catch (_) {}

  if (action === 'add') {
    navigateTo('medicinas');
    openAddForm();
  } else if (action === 'sos') {
    // Intención explícita desde el acceso directo del launcher:
    // se omite la pulsación larga, pero la cuenta atrás de 10 s
    // y el botón Cancelar siguen aplicando.
    navigateTo('sos');
  }
}

// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════
async function init() {
  _resolvePlugins();

  // Biometric gate runs inside loadState(). If auth fails,
  // _showLockScreen() is injected and we return immediately —
  // nothing below executes until the user retries.
  await loadState();
  if (document.getElementById('lock-overlay')) return;

  applySettings();
  buildColorPicker();
  wireEvents();
  setupDoubleTap();
  startClock();
  resetDailyConfirmed();
  renderInicio();
  startReminderLoop();
  syncNativeNotifications();
  handleShortcut();

  if ('Notification' in window && state.settings.notifEnabled) {
    Notification.requestPermission();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }

  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');
  }, 900);

  setTimeout(() => speak(getGreeting() + '. Bienvenido a MediTime.'), 1200);
}

document.addEventListener('DOMContentLoaded', () => { init(); });
