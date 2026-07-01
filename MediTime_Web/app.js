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

// Listas blancas y validadores (fuente única de verdad para el formulario)
const VALID_FREQUENCIES = ['diario', 'semana', 'finde', 'alterno'];
const VALID_PRIORITIES = ['normal', 'urgente'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// Límites de longitud de los campos del formulario
const MAX_NAME_LEN  = 60;
const MAX_DOSE_LEN  = 40;
const MAX_NOTES_LEN = 200;

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
// LOCALIZATION (i18n)
// Diccionarios en locales/es.json y locales/en.json. Español es
// siempre el idioma de reserva: si falta una clave en el idioma
// activo, o si el fetch del idioma elegido falla, se usa el texto
// en español para que la app nunca muestre una clave en bruto.
// ══════════════════════════════════════════════════════════
const SUPPORTED_LANGS = ['es', 'en'];
const DEFAULT_LANG = 'es';

let LANG = DEFAULT_LANG;
let STRINGS = {};       // diccionario del idioma activo
let STRINGS_ES = null;  // diccionario español, cacheado como reserva

// Idioma del dispositivo si es uno soportado; si no, español.
function detectDeviceLanguage() {
  try {
    const langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ''];
    for (const l of langs) {
      const code = String(l).slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGS.includes(code)) return code;
    }
  } catch (_) {}
  return DEFAULT_LANG;
}

// Carga locales/<lang>.json. Devuelve {} si falla (nunca lanza):
// el llamador cae de vuelta al español ya cacheado.
async function loadLocaleJSON(lang) {
  try {
    const res = await fetch('locales/' + lang + '.json');
    if (!res.ok) return {};
    return await res.json();
  } catch (_) {
    return {};
  }
}

// Busca "a.b.c" dentro de un objeto anidado. undefined si no existe.
function _lookupKey(dict, key) {
  const parts = key.split('.');
  let node = dict;
  for (const p of parts) {
    if (!node || typeof node !== 'object' || !(p in node)) return undefined;
    node = node[p];
  }
  return typeof node === 'string' ? node : undefined;
}

// Sustituye {placeholders} por los valores de `vars`.
function _interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// Traduce `key` (ruta con puntos, p.ej. "sos.title") con placeholders
// opcionales. Reserva: idioma activo → español → la propia clave
// (para nunca dejar la interfaz en blanco, ni siquiera con un
// diccionario corrupto o incompleto).
function tr(key, vars) {
  const val = _lookupKey(STRINGS, key)
    ?? _lookupKey(STRINGS_ES, key)
    ?? key;
  return _interpolate(val, vars);
}

// Aplica las traducciones a todo el DOM estático marcado con
// data-i18n / data-i18n-aria-label / data-i18n-placeholder /
// data-i18n-title. Se puede llamar de nuevo tras cambiar idioma,
// sin recargar la página.
function applyStaticI18n(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = tr(el.getAttribute('data-i18n'));
  });
  scope.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', tr(el.getAttribute('data-i18n-aria-label')));
  });
  scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', tr(el.getAttribute('data-i18n-placeholder')));
  });
  scope.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', tr(el.getAttribute('data-i18n-title')));
  });
  document.documentElement.setAttribute('lang', LANG);
}

// Precarga el español como reserva segura ANTES de loadState(): la
// pantalla de bloqueo biométrico puede aparecer durante loadState()
// (antes de conocer el idioma guardado), y tr() la necesita disponible
// para no mostrar claves en bruto en una pantalla de seguridad.
async function preloadI18nFallback() {
  STRINGS_ES = await loadLocaleJSON('es');
  STRINGS = STRINGS_ES;
  LANG = 'es';
}

// Resuelve el idioma efectivo (ajuste guardado o detección de
// dispositivo) y carga su diccionario si es distinto del español ya
// precargado. Se llama una vez en init(), justo después de loadState().
async function initI18n() {
  const pref = state.settings.language;
  LANG = (pref === 'es' || pref === 'en') ? pref : detectDeviceLanguage();
  STRINGS = (LANG === 'es') ? STRINGS_ES : await loadLocaleJSON(LANG);
  applyStaticI18n();
}

// Cambia de idioma en caliente: recarga el diccionario, re-renderiza
// la vista actual y guarda la preferencia. `lang` es 'auto'|'es'|'en'.
async function setLanguage(lang) {
  state.settings.language = lang;
  LANG = (lang === 'es' || lang === 'en') ? lang : detectDeviceLanguage();
  STRINGS = (LANG === 'es') ? STRINGS_ES : await loadLocaleJSON(LANG);
  applyStaticI18n();
  saveState();
  if (currentView === 'inicio')    renderInicio();
  if (currentView === 'medicinas') renderMedicineList();
  if (currentView === 'historial') renderHistory();
  if (currentView === 'ajustes')   populateSettings();
  speak(tr('settings.languageChangedSpeech'));
  showToast(tr('settings.savedToast'), 'success');
}

// Etiqueta traducida de una frecuencia (reemplaza el antiguo FREQ_LABELS fijo en español).
function freqLabel(freq) {
  const map = { diario: 'form.freqDiario', semana: 'form.freqSemana', finde: 'form.freqFinde', alterno: 'form.freqAlterno' };
  return tr(map[freq] || 'form.freqDiario');
}

// Versión corta de la etiqueta de frecuencia, usada como respaldo en la fila de alarma.
function freqLabelShort(freq) {
  const map = { diario: 'home.freqShortDiario', semana: 'home.freqShortSemana', finde: 'home.freqShortFinde', alterno: 'home.freqShortAlterno' };
  return tr(map[freq] || 'home.freqShortDiario');
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
  title.textContent = tr('lock.title');

  const desc = document.createElement('p');
  desc.id = 'lock-desc';
  desc.style.cssText = 'margin:0;font-size:0.95rem;color:var(--text-muted,#5eead4);text-align:center;max-width:280px';
  desc.textContent = reason || tr('lock.defaultReason');

  const retryBtn = document.createElement('button');
  retryBtn.style.cssText = [
    'margin-top:8px', 'padding:12px 28px',
    'border:none', 'border-radius:12px',
    'background:var(--primary,#0D9488)',
    'color:#fff', 'font-size:1rem', 'cursor:pointer',
  ].join(';');
  retryBtn.textContent = tr('lock.retryButton');
  retryBtn.setAttribute('aria-label', tr('lock.retryAriaLabel'));
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
    seniorMode:       true,   // adultos mayores: toasts e instrucciones más visibles
    snoozeMinutes:    10,
    sosNumber:        '911',
    language:         'auto', // 'auto'|'es'|'en' — 'auto' sigue el idioma del dispositivo
  },
  profile: {
    name:        '',
    age:         '',
    doctorName:  '',
    doctorPhone: '',
  },
  contacts: [], // [{id, name, phone}]
  sos: {
    lastKnownLocation: null,   // {lat, lng, accuracy, ts} — última posición GPS válida (solo local)
  },
};

// Runtime-only (never persisted)
let sosTimerID     = null;
let sosHoldTimer   = null;     // timer de pulsación larga del botón SOS
let practiceMode   = false;    // alarma de práctica: no escribe historial ni datos
let sosPractice    = false;    // SOS de práctica: nunca marca ni llama
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
  if (parsed.sos && typeof parsed.sos === 'object' && isValidLocation(parsed.sos.lastKnownLocation)) {
    state.sos.lastKnownLocation = parsed.sos.lastKnownLocation;
  }
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
          reason:             tr('lock.biometricReason'),
          title:              'MediTime PRO',
          subtitle:           tr('lock.biometricSubtitle'),
          description:        tr('lock.biometricDescription'),
          negativeButtonText: tr('common.cancel'),
          maxAttempts:        3,
        });
      } catch (bioErr) {
        const msg       = (bioErr && bioErr.message) || '';
        const isCancel  = /cancel/i.test(msg);
        const isLockout = /lockout|too many/i.test(msg);
        _showLockScreen(
          isLockout
            ? tr('lock.lockoutReason')
            : isCancel
              ? tr('lock.cancelReason')
              : tr('lock.genericReason')
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
      if (!notFound) showToast(tr('storage.readError'), 'error');
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
    sos:       state.sos,
  });

  if (_SecureStorage) {
    try {
      await _SecureStorage.set({ key: STORAGE_KEY, value: payload });
    } catch (_) {
      showToast(tr('storage.saveError'), 'error');
    }
    return;
  }

  // Browser fallback
  try {
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (_) {
    showToast(tr('storage.saveError'), 'error');
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

  // Botón de acción opcional (p. ej. "Deshacer"): el toast dura más
  // para dar tiempo a pulsarlo.
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
  // Modo adulto mayor: el aviso permanece más tiempo en pantalla para
  // que dé tiempo a leerlo sin prisas. Sin modo senior se mantienen las
  // duraciones cortas originales.
  const senior   = state.settings.seniorMode;
  const duration = action
    ? (senior ? 9000 : 5000)
    : (senior ? 7000 : 3200);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
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
  if (currentView === 'sos' && view !== 'sos') { clearSOS(); sosPractice = false; }

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

  const viewNames = { inicio: tr('views.home'), medicinas: tr('views.meds'), sos: tr('views.sos'), historial: tr('views.history'), ajustes: tr('views.settings') };
  speak(view === 'historial'
    ? historySummarySpeech()
    : tr('nav.sectionSpeech', { section: viewNames[view] || view }));
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
  if (h < 12) return tr('greeting.morning');
  if (h < 20) return tr('greeting.afternoon');
  return tr('greeting.evening');
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
  if (nameEl) nameEl.textContent = state.profile.name ? state.profile.name : tr('greeting.defaultName');

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
      summaryEl.textContent = tr('home.noMedsToday');
    } else {
      summaryEl.textContent = tr('home.summaryTaken', { taken, total });
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

  nextEl.textContent = next ? next.time : tr('home.nonePending');
}

function renderTodayAlarms(todayMeds) {
  const container = document.getElementById('today-alarms');
  if (!container) return;
  clearElement(container);

  const allAlarms = [];
  todayMeds.forEach(med => {
    med.times.forEach(t => {
      allAlarms.push({ med, time: t });
    });
  });
  allAlarms.sort((a, b) => a.time.localeCompare(b.time));

  if (allAlarms.length === 0) {
    const p = document.createElement('p');
    p.textContent = tr('home.noMedsForToday');
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
    detail.textContent = med.dose || freqLabelShort(med.frequency) || '';

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
    row.setAttribute('aria-label', med.confirmedToday[time]
      ? tr('home.alarmRowTaken', { name: med.name, time })
      : tr('home.alarmRowPending', { name: med.name, time }));

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
// Canal de alarmas de Android. En Android 8+ el SONIDO de la notificación lo
// define el CANAL, no cada aviso: por eso, con la app cerrada, sin un canal con
// sonido el aviso aparece mudo en la barra. Los ajustes de un canal son
// "pegajosos": una vez creado, Android ignora cambios posteriores de sonido o
// importancia. Si alguna vez cambia el sonido, hay que SUBIR el id (v2 → v3) o
// desinstalar/reinstalar la app al probar en el dispositivo.
// v2 → v3: nuevo sonido meditime_alarm_v3.wav (≈15 s, 5× el original).
const MEDICINE_ALARM_CHANNEL_ID = 'meditime_medicine_alarms_v3';
// Recurso de sonido en android/app/src/main/res/raw/ (el plugin recorta la
// extensión). El archivo debe ir en minúsculas con guion bajo.
// meditime_alarm_v3.wav se genera con scripts/generate-alarm-sound.mjs.
const MEDICINE_ALARM_SOUND = 'meditime_alarm_v3.wav';
// Cuántos días por delante se agendan notificaciones concretas (one-shot). La
// app reprograma al abrirse y tras cada cambio, así que ~2 semanas sobran y
// evita agendar de más.
const NOTIF_DAYS_AHEAD = 14;
// Tope global de pendientes, por prudencia ante límites de algunos fabricantes.
const NOTIF_MAX_TOTAL = 180;

// Crea (idempotente) el canal de alarmas con sonido propio. Llamar antes de
// agendar y al iniciar la app. Sin soporte de canales no hace nada.
async function ensureMedicineAlarmChannel() {
  if (!_LocalNotifications || typeof _LocalNotifications.createChannel !== 'function') return;
  try {
    // Nota i18n: el nombre/descripción del canal son "pegajosos" (ver comentario
    // más abajo): quedan fijados al idioma activo en la PRIMERA creación del
    // canal y Android ignora cambios posteriores salvo que se suba el id.
    await _LocalNotifications.createChannel({
      id:          MEDICINE_ALARM_CHANNEL_ID,
      name:        tr('settings.notifStep2b'),
      description: tr('alarm.channelDescription'),
      importance:  5,        // IMPORTANCE_HIGH/MAX: suena y asoma en pantalla
      visibility:  1,        // VISIBILITY_PUBLIC: visible en pantalla bloqueada
      sound:       MEDICINE_ALARM_SOUND,
      vibration:   true,
      lights:      true,
      lightColor:  '#14B8A6',
    });
  } catch (_) {
    // Android <8 o navegador: se usa el canal por defecto
  }
}

// Divide "HH:mm" en [hora, minuto] numéricos. Devuelve null si no es válida.
function parseTimeParts(time) {
  if (typeof time !== 'string') return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

// ¿Fecha inválida, pasada o demasiado próxima (≤ ahora+60 s) para agendar?
// Evita avisos "rancios" que Android entregaría tarde o de inmediato.
function shouldSkipPastDate(date, now = Date.now()) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return true;
  return date.getTime() <= now + 60_000;
}

// Próximas `count` fechas diarias (una por día) a hora:minuto, todas futuras.
// Si la hora de hoy ya pasó (o está en el margen), empieza mañana.
function nextDailyDates(hour, minute, count, fromTs = Date.now()) {
  const out = [];
  const cursor = new Date(fromTs);
  cursor.setHours(hour, minute, 0, 0);
  if (shouldSkipPastDate(cursor, fromTs)) cursor.setDate(cursor.getDate() + 1);
  while (out.length < count) {
    out.push(new Date(cursor.getTime()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Próximas `count` fechas en los días permitidos (convención JS de getDay():
// 0=domingo … 6=sábado), a hora:minuto, todas futuras y en orden ascendente.
function nextWeekdayDates(hour, minute, weekdays, count, fromTs = Date.now()) {
  const allow = new Set(weekdays);
  const out = [];
  const cursor = new Date(fromTs);
  cursor.setHours(hour, minute, 0, 0);
  let guard = 0;
  while (out.length < count && guard < count * 7 + 14) {
    guard++;
    if (allow.has(cursor.getDay()) && !shouldSkipPastDate(cursor, fromTs)) {
      out.push(new Date(cursor.getTime()));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Construye una notificación de medicina lista para agendar: canal (sonido en
// Android 8+), `sound` de respaldo para Android 7.x, y metadatos en `extra` para
// que el listener sepa qué dosis abrir al tocarla.
function buildNotificationForMedicine(med, time, atDate, id) {
  return {
    id,
    channelId:  MEDICINE_ALARM_CHANNEL_ID,
    title:      tr('alarm.notifTitle'),
    body:       med.dose ? tr('alarm.notifBodyDose', { name: med.name, dose: med.dose, time }) : tr('alarm.notifBody', { name: med.name, time }),
    sound:      MEDICINE_ALARM_SOUND,   // respaldo Android 7.x (en 8+ manda el canal)
    autoCancel: false,
    ongoing:    false,
    schedule:   { at: atDate, allowWhileIdle: true },
    extra:      { medId: med.id, time, kind: 'medicine-reminder' },
  };
}

// Calcula las próximas `count` fechas válidas para un medicamento de días
// alternos, partiendo de su createdAt y con la misma paridad que usa
// getMedicinesForToday. Devuelve objetos Date (uno por toma) en el futuro.
function nextAlternateDates(createdAt, hour, minute, count, fromTs = Date.now()) {
  const createdDay = Math.floor(createdAt / 86_400_000);
  const out = [];
  const cursor = new Date(fromTs);
  cursor.setHours(hour, minute, 0, 0);
  let guard = 0;
  while (out.length < count && guard < count * 4 + 14) {
    guard++;
    const dayIndex = Math.floor(cursor.getTime() / 86_400_000);
    if ((dayIndex - createdDay) % 2 === 0 && cursor.getTime() > fromTs) {
      out.push(new Date(cursor.getTime()));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Devuelve { ok, scheduledCount, nextAt, exactAlarmStatus, error? }.
// Nunca lanza: el llamador puede ignorar el resultado sin riesgo.
async function syncNativeNotifications() {
  if (!_LocalNotifications) {
    return { ok: false, scheduledCount: 0, nextAt: null, exactAlarmStatus: 'unsupported' };
  }
  try {
    let perm = await _LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await _LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') {
        return { ok: false, scheduledCount: 0, nextAt: null, exactAlarmStatus: 'unsupported', error: 'permission_denied' };
      }
    }

    const exactAlarmStatus = await checkExactAlarmSupport();

    // El sonido con la app cerrada depende del canal: crearlo antes de agendar.
    await ensureMedicineAlarmChannel();

    // Se cancelan SOLO los recordatorios de medicina (ids < 900000); los avisos
    // de "dosis pospuesta" (ids 900000+) ya programados se dejan intactos.
    const pending = await _LocalNotifications.getPending();
    if (pending && pending.notifications && pending.notifications.length) {
      const stale = pending.notifications
        .filter(n => Number(n.id) < 900000)
        .map(n => ({ id: n.id }));
      if (stale.length) await _LocalNotifications.cancel({ notifications: stale });
    }

    // Días permitidos por frecuencia, en convención JS de getDay(): 0=domingo … 6=sábado.
    const WEEKDAYS_JS = { semana: [1, 2, 3, 4, 5], finde: [0, 6] };
    const now     = Date.now();
    const nowDate = new Date(now);
    const horizon = now + NOTIF_DAYS_AHEAD * 86_400_000;
    const toSchedule = [];
    let nextId = 1;

    state.medicines.forEach(med => {
      (med.times || []).forEach(t => {
        const parts = parseTimeParts(t);
        if (!parts) return;                 // hora corrupta: no se agenda basura
        const [hour, minute] = parts;

        // Se generan fechas CONCRETAS (one-shot) en vez de repeticiones
        // indefinidas: así nunca se entrega una toma "rancia" tarde y las
        // pendientes quedan auditables. Acotado a ~NOTIF_DAYS_AHEAD días.
        let dates;
        if (med.frequency === 'alterno') {
          dates = nextAlternateDates(med.createdAt, hour, minute, NOTIF_DAYS_AHEAD, now);
        } else if (WEEKDAYS_JS[med.frequency]) {
          dates = nextWeekdayDates(hour, minute, WEEKDAYS_JS[med.frequency], NOTIF_DAYS_AHEAD, now);
        } else {
          dates = nextDailyDates(hour, minute, NOTIF_DAYS_AHEAD, now);
        }

        dates.forEach(at => {
          if (shouldSkipPastDate(at, now)) return;   // nunca en el pasado/inminente
          if (at.getTime() > horizon)     return;    // ni más allá del horizonte
          // Si la toma de HOY ya está confirmada u omitida, no re-alarmar hoy.
          const sameDay = at.getDate()     === nowDate.getDate()
                       && at.getMonth()    === nowDate.getMonth()
                       && at.getFullYear() === nowDate.getFullYear();
          if (sameDay && med.confirmedToday && med.confirmedToday[t]) return;
          toSchedule.push(buildNotificationForMedicine(med, t, at, nextId++));
        });
      });
    });

    const batch = toSchedule.slice(0, NOTIF_MAX_TOTAL);
    if (batch.length) {
      await _LocalNotifications.schedule({ notifications: batch });
    }

    // Hora más próxima programada en formato "HH:mm" para el feedback al usuario.
    let nextAt = null;
    if (batch.length) {
      let earliest = Infinity;
      for (const n of batch) {
        const ts = n.schedule && n.schedule.at instanceof Date ? n.schedule.at.getTime() : Infinity;
        if (ts < earliest) earliest = ts;
      }
      if (isFinite(earliest)) {
        const d = new Date(earliest);
        const pad = x => String(x).padStart(2, '0');
        nextAt = pad(d.getHours()) + ':' + pad(d.getMinutes());
      }
    }

    return { ok: true, scheduledCount: batch.length, nextAt, exactAlarmStatus };
  } catch (err) {
    // Sin permiso o sin plugin: siguen funcionando los recordatorios web
    return { ok: false, scheduledCount: 0, nextAt: null, exactAlarmStatus: 'unsupported', error: String(err) };
  }
}

// ── Alarmas exactas (Android 12+) ─────────────────────────────────────────────
// Sin "alarmas exactas" Android puede retrasar los avisos (se vieron a las 18:45
// cuando tocaban a las 18:00). Avisamos una sola vez por sesión y ofrecemos
// abrir los ajustes del sistema; nunca bloquea la app si la API no existe.
let _exactAlarmWarned = false;

// Devuelve 'granted' | 'denied' | 'unsupported'. Nunca lanza.
async function checkExactAlarmSupport() {
  if (!_LocalNotifications || typeof _LocalNotifications.checkExactNotificationSetting !== 'function') {
    return 'unsupported';
  }
  try {
    const res = await _LocalNotifications.checkExactNotificationSetting();
    return res && res.exact_alarm === 'granted' ? 'granted' : 'denied';
  } catch (_) {
    return 'unsupported';
  }
}

// Abre los ajustes del sistema para activar alarmas exactas (Android 12+).
async function openExactAlarmSettings() {
  if (!_LocalNotifications || typeof _LocalNotifications.changeExactNotificationSetting !== 'function') return;
  try { await _LocalNotifications.changeExactNotificationSetting(); } catch (_) {}
}

// Aviso no intrusivo (una vez por sesión) si faltan las alarmas exactas.
async function maybeWarnExactAlarm() {
  if (_exactAlarmWarned) return;
  const status = await checkExactAlarmSupport();
  if (status !== 'denied') return;   // concedidas o no aplica → silencio
  _exactAlarmWarned = true;
  showToast(
    tr('settings.exactAlarmWarnToast'),
    'warning',
    { label: tr('settings.exactAlarmWarnAction'), ariaLabel: tr('settings.exactAlarmWarnActionAriaLabel'), onAction: openExactAlarmSettings },
  );
}

// Botón "Revisar alarmas exactas" de Ajustes: confirma el estado o abre ajustes.
async function reviewExactAlarms() {
  const status = await checkExactAlarmSupport();
  if (status === 'granted') {
    showToast(tr('settings.exactAlarmGranted'), 'success');
    speak(tr('settings.exactAlarmGranted'));
  } else if (status === 'denied') {
    speak(tr('settings.exactAlarmOpeningSpeech'));
    openExactAlarmSettings();
  } else {
    showToast(tr('settings.exactAlarmNotNeeded'), 'success');
  }
}

// ── Prueba de alarma nativa (Task 2) ─────────────────────────────────────────
// Programa una notificación nativa exactamente 3 minutos en el futuro con el
// canal y sonido de producción. El usuario puede bloquear la pantalla y comprobar
// si el sonido suena, lo que aisla el problema nativo del modal/WebAudio en-app.
async function scheduleNativeAlarmTest() {
  if (!_LocalNotifications) {
    showToast(tr('alarm.nativeTestUnavailable'), 'warning');
    return;
  }
  try {
    let perm = await _LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await _LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') {
        showToast(tr('alarm.permissionDeniedToast'), 'error');
        return;
      }
    }
    await ensureMedicineAlarmChannel();

    // Cancelar prueba anterior si existía
    try { await _LocalNotifications.cancel({ notifications: [{ id: 990001 }] }); } catch (_) {}

    const testDate = new Date(Date.now() + 3 * 60_000);
    const pad = x => String(x).padStart(2, '0');
    const testTimeStr = pad(testDate.getHours()) + ':' + pad(testDate.getMinutes());

    await _LocalNotifications.schedule({
      notifications: [{
        id:         990001,
        channelId:  MEDICINE_ALARM_CHANNEL_ID,
        title:      tr('alarm.testNotifTitle'),
        body:       tr('alarm.testNotifBody'),
        sound:      MEDICINE_ALARM_SOUND,
        autoCancel: false,
        schedule:   { at: testDate, allowWhileIdle: true },
        extra:      { kind: 'native-alarm-test' },
      }],
    });

    const pending = await _LocalNotifications.getPending();
    const found = pending && pending.notifications && pending.notifications.some(n => Number(n.id) === 990001);
    if (found) {
      showToast(tr('alarm.scheduledTestToast', { time: testTimeStr }), 'success');
    } else {
      showToast(tr('alarm.testNotPendingToast'), 'warning');
    }
  } catch (err) {
    showToast(tr('alarm.testErrorToast', { err: String(err) }), 'error');
  }
}

// ── Diagnóstico de notificaciones (Task 3) ───────────────────────────────────
// Muestra un panel con el estado de permisos, canal, conteo de pendientes y las
// próximas 5 notificaciones agendadas. Solo usa createElement/textContent.
async function showNotifDiagnostics() {
  if (!_LocalNotifications) {
    showToast(tr('alarm.diagUnavailable'), 'warning');
    return;
  }
  try {
    const permResult  = await _LocalNotifications.checkPermissions();
    const permStatus  = permResult.display || 'unknown';
    const exactStatus = await checkExactAlarmSupport();
    const pending     = await _LocalNotifications.getPending();
    const notifs      = (pending && pending.notifications) ? pending.notifications : [];
    const testPending = notifs.some(n => Number(n.id) === 990001);

    const existing = document.getElementById('notif-diagnostics-panel');
    if (existing) { existing.remove(); return; }   // segunda pulsación cierra

    const panel = document.createElement('div');
    panel.id = 'notif-diagnostics-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', tr('alarm.diagAriaLabel'));
    panel.style.cssText = 'margin-top:12px;padding:12px;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:8px;font-size:0.85rem;line-height:1.6';

    const addLine = (label, value) => {
      const p = document.createElement('p');
      p.style.cssText = 'margin:0 0 4px';
      const b = document.createElement('b');
      b.textContent = label + ': ';
      p.appendChild(b);
      p.appendChild(document.createTextNode(String(value)));
      panel.appendChild(p);
    };

    addLine(tr('alarm.diagPermLabel'), permStatus);
    addLine(tr('alarm.diagExactLabel'), exactStatus);
    addLine(tr('alarm.diagChannelLabel'), MEDICINE_ALARM_CHANNEL_ID);
    addLine(tr('alarm.diagSoundLabel'), MEDICINE_ALARM_SOUND);
    addLine(tr('alarm.diagPendingLabel'), notifs.length);
    addLine(tr('alarm.diagTestPendingLabel'), testPending ? tr('alarm.diagYes') : tr('alarm.diagNo'));

    const top5 = notifs.slice(0, 5);
    if (top5.length) {
      const h = document.createElement('p');
      h.style.cssText = 'margin:8px 0 2px;font-weight:bold';
      h.textContent = tr('alarm.diagUpcomingLabel', { n: top5.length });
      panel.appendChild(h);
      const pad = x => String(x).padStart(2, '0');
      top5.forEach(n => {
        const p = document.createElement('p');
        p.style.cssText = 'margin:0 0 2px;padding-left:8px;font-size:0.8rem';
        let info = 'id=' + n.id + '  ' + (n.title || tr('alarm.diagNoTitle'));
        if (n.schedule && n.schedule.at) {
          const at = new Date(n.schedule.at);
          if (!isNaN(at.getTime())) info += '  ' + pad(at.getHours()) + ':' + pad(at.getMinutes());
        }
        if (n.channelId) info += '  ch=' + n.channelId;
        p.textContent = info;
        panel.appendChild(p);
      });
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-outline';
    closeBtn.style.cssText = 'margin-top:10px;font-size:0.8rem';
    closeBtn.textContent = tr('alarm.diagCloseButton');
    closeBtn.addEventListener('click', () => panel.remove());
    panel.appendChild(closeBtn);

    const diagBtn = document.getElementById('btn-notif-diagnostics');
    if (diagBtn && diagBtn.parentNode) {
      diagBtn.parentNode.insertBefore(panel, diagBtn.nextSibling);
    }
  } catch (err) {
    showToast(tr('alarm.diagErrorToast', { err: String(err) }), 'error');
  }
}

// Al tocar una notificación de medicina: abrir la app en Inicio y, si la dosis
// sigue pendiente, mostrar el modal de alarma con su sonido en-app.
function handleNotificationTap(extra) {
  navigateTo('inicio');
  if (!extra || !extra.medId) return;
  const med = state.medicines.find(m => m.id === extra.medId);
  if (!med) return;
  const time = extra.time;
  const alreadyTaken = med.confirmedToday && med.confirmedToday[time];
  if (time && !alreadyTaken) {
    showAlarmModal(med, time);
    playSound(med.priority === 'urgente' ? 'urgente' : 'normal');
    vibrate(med.priority === 'urgente' ? 'urgent' : 'alarm');
  }
}

// Registra los listeners del plugin (solo nativo). El sonido de fondo NO depende
// de esto, sino del canal de Android; esto solo mejora el toque/apertura.
function registerNotificationListeners() {
  if (!_LocalNotifications || typeof _LocalNotifications.addListener !== 'function') return;
  try {
    _LocalNotifications.addListener('localNotificationActionPerformed', ev => {
      const extra = ev && ev.notification && ev.notification.extra;
      handleNotificationTap(extra);
    });
  } catch (_) {}
}

// ══════════════════════════════════════════════════════════
// ALARM TRIGGER
// ══════════════════════════════════════════════════════════
function triggerAlarm(med, time) {
  const soundName = med.priority === 'urgente' ? 'urgente' : 'normal';
  playSound(soundName);
  vibrate(med.priority === 'urgente' ? 'urgent' : 'alarm');

  speak(tr('alarm.speakAlarm', { name: med.name, dose: med.dose || '', notes: med.notes || '' }));

  showAlarmModal(med, time);

  // Web Notification
  if (state.settings.notifEnabled && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(tr('alarm.notifTitle'), {
        body: med.dose ? tr('alarm.notifBodyDose', { name: med.name, dose: med.dose, time }) : tr('alarm.notifBody', { name: med.name, time }),
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

  if (titleEl) titleEl.textContent = tr('alarm.modalTitle');
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
  practiceMode   = false;
}

// ── Práctica de alarma ──
// Abre el modal de alarma real con datos de demostración. No programa
// notificaciones, no añade ningún medicamento y no escribe en el historial:
// cualquier botón (Tomado/Posponer/Omitir) solo muestra ánimo y cierra.
function openPracticeAlarm() {
  practiceMode = true;
  const demo = {
    id:    '__practice__',
    name:  tr('alarm.practiceMedName'),
    dose:  tr('alarm.practiceDose'),
    notes: tr('alarm.practiceNotes'),
    confirmedToday: {},
    snoozedUntil:   {},
  };
  showAlarmModal(demo, '08:00');
  const titleEl = document.getElementById('alarm-modal-title');
  if (titleEl) titleEl.textContent = tr('alarm.practiceTitle');
  playSound('normal');
  vibrate('alarm');
  speak(tr('alarm.practiceSpeech'));
}

function endPracticeAlarm(msg) {
  closeAlarmModal(); // ya pone practiceMode = false
  playSound('confirmacion');
  speak(msg);
  showToast(msg, 'success');
}

function confirmDose() {
  if (practiceMode) { endPracticeAlarm(tr('alarm.practiceDoneTaken')); return; }
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
  speak(tr('alarm.confirmedSpeech'));
  // Se guarda al instante (si la app se cierra, la toma no se pierde) y
  // "Deshacer" revierte: quita la marca del día y el registro del historial.
  showToast(tr('alarm.confirmedToast', { name: med.name }), 'success', {
    label:     tr('alarm.undoLabel'),
    ariaLabel: tr('alarm.undoAriaLabel', { name: med.name }),
    onAction:  () => undoConfirmDose(med.id, time, entry.id),
  });
  // La toma de hoy ya no debe re-alarmar: reprograma para descartar su aviso nativo.
  syncNativeNotifications().catch(() => {});
  closeAlarmModal();
  if (currentView === 'inicio') renderInicio();
}

function undoConfirmDose(medId, time, entryId) {
  const med = state.medicines.find(m => m.id === medId);
  if (med && med.confirmedToday) delete med.confirmedToday[time];
  state.history = state.history.filter(e => e.id !== entryId);
  saveState();
  // Al deshacer, la dosis vuelve a estar pendiente: reprograma su aviso nativo.
  syncNativeNotifications().catch(() => {});
  speak(tr('alarm.undoneSpeech'));
  showToast(tr('alarm.undoneToast'), 'warning');
  if (currentView === 'inicio')    renderInicio();
  if (currentView === 'historial') renderHistory();
}

function snoozeDose() {
  if (practiceMode) { endPracticeAlarm(tr('alarm.practiceDoneSnooze')); return; }
  if (!alarmModalMed || !alarmModalTime) return;
  const minutes = state.settings.snoozeMinutes;
  if (!alarmModalMed.snoozedUntil) alarmModalMed.snoozedUntil = {};
  alarmModalMed.snoozedUntil[alarmModalTime] = Date.now() + minutes * 60_000;
  state.history.unshift(createHistoryEntry(alarmModalMed.id, alarmModalMed.name, alarmModalTime, 'snoozed'));
  pruneHistory();
  saveState();
  // Aviso nativo único al vencer el aplazamiento (suena con app cerrada).
  // Usa el mismo canal con sonido para que también suene en segundo plano.
  if (_LocalNotifications) {
    ensureMedicineAlarmChannel();
    _LocalNotifications.schedule({
      notifications: [{
        id:         900000 + Math.floor(Math.random() * 90000),
        channelId:  MEDICINE_ALARM_CHANNEL_ID,
        title:      tr('alarm.snoozeNotifTitle'),
        body:       alarmModalMed.dose ? tr('alarm.snoozeNotifBodyDose', { name: alarmModalMed.name, dose: alarmModalMed.dose }) : alarmModalMed.name,
        sound:      MEDICINE_ALARM_SOUND,
        autoCancel: false,
        schedule:   { at: new Date(Date.now() + minutes * 60_000), allowWhileIdle: true },
        extra:      { medId: alarmModalMed.id, time: alarmModalTime, kind: 'medicine-snooze' },
      }],
    }).catch(() => {});
  }
  playSound('suave');
  speak(tr('alarm.snoozedSpeech', { minutes }));
  showToast(tr('alarm.snoozedToast', { minutes }), 'warning');
  closeAlarmModal();
}

function skipDose() {
  if (practiceMode) { endPracticeAlarm(tr('alarm.practiceDoneSkip')); return; }
  if (!alarmModalMed || !alarmModalTime) return;
  alarmModalMed.confirmedToday[alarmModalTime] = true; // mark so it stops alerting
  state.history.unshift(createHistoryEntry(alarmModalMed.id, alarmModalMed.name, alarmModalTime, 'skipped'));
  pruneHistory();
  saveState();
  playSound('error');
  speak(tr('alarm.skippedSpeech'));
  showToast(tr('alarm.skippedToast'), 'error');
  // La toma omitida ya no debe re-alarmar hoy: reprograma sin su aviso nativo.
  syncNativeNotifications().catch(() => {});
  closeAlarmModal();
  if (currentView === 'inicio') renderInicio();
}

// ══════════════════════════════════════════════════════════
// MEDICINE LIST VIEW
// ══════════════════════════════════════════════════════════
function renderMedicineList() {
  const container = document.getElementById('med-list-container');
  if (!container) return;
  clearElement(container);

  if (state.medicines.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '💊';
    const p = document.createElement('p');
    p.textContent = tr('meds.empty');
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
      urgBadge.textContent = tr('form.priorityUrgent');
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
    editBtn.setAttribute('aria-label', tr('meds.editAriaLabel', { name: med.name }));
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => openEditForm(med.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon danger';
    delBtn.setAttribute('aria-label', tr('meds.deleteAriaLabel', { name: med.name }));
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

// Estado del selector manual con + / − (no se persiste).
let manualHour   = 8;
let manualMinute = 30;

// Construye "HH:mm" a partir de hora y minuto, con envolvente segura
// (las horas dan la vuelta 00–23 y los minutos 00–59).
function formatTimeFromParts(hour, minute) {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  const m = ((Math.trunc(minute) % 60) + 60) % 60;
  return pad(h) + ':' + pad(m);
}

// Añade una hora a formTimes solo si no estaba ya. Devuelve true si se añadió.
function addTimeIfNew(time) {
  if (formTimes.includes(time)) return false;
  formTimes.push(time);
  return true;
}

function openAddForm() {
  editMedId = null;
  formTimes = [];

  const titleEl = document.getElementById('form-title');
  if (titleEl) titleEl.textContent = tr('form.addTitle');

  clearForm();
  renderTimesInForm();
  showFormPanel();
  speak(tr('form.addSpeech'));
}

function openEditForm(id) {
  const med = state.medicines.find(m => m.id === id);
  if (!med) return;
  editMedId = id;
  formTimes = [...med.times];

  const titleEl = document.getElementById('form-title');
  if (titleEl) titleEl.textContent = tr('form.editTitle');

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

  manualHour   = 8;
  manualMinute = 30;
  renderManualTime();
  renderTimesInForm();
  showFormPanel();
  speak(tr('form.editSpeech', { name: med.name }));
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
  manualHour   = 8;
  manualMinute = 30;
  renderManualTime();
  renderTimesInForm();
}

function renderTimesInForm() {
  const container = document.getElementById('times-container');
  if (!container) return;
  clearElement(container);

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
    timeInput.setAttribute('aria-label', tr('form.hourAriaLabel', { n: idx + 1 }));
    timeInput.addEventListener('change', e => { formTimes[idx] = e.target.value; });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', tr('form.removeHourAriaLabel', { time: t }));
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
  if (addTimeIfNew(t)) {
    renderTimesInForm();
    speak(tr('form.timeAddedSpeech', { time: t }));
  } else {
    showToast(tr('form.timeAlreadyAddedToast'), 'warning');
    speak(tr('form.timeAlreadyAddedSpeech'));
  }
}

// Toque en un botón de rutina (Mañana, Mediodía…): añade su hora típica.
// `presetKey` es el data-preset del botón ("morning"|"noon"|"afternoon"|"night"|"bedtime"),
// usado para traducir la etiqueta en vez de depender de texto ya localizado en el DOM.
function addPresetTime(time, presetKey) {
  if (!TIME_RE.test(time)) return;
  const nameKey = 'form.preset' + presetKey.charAt(0).toUpperCase() + presetKey.slice(1) + 'Name';
  const label = tr(nameKey);
  if (addTimeIfNew(time)) {
    renderTimesInForm();
    showToast(tr('form.presetAddedToast', { label, time }), 'success');
    speak(tr('form.presetAddedSpeech', { label, time }));
  } else {
    showToast(tr('form.timeAlreadyAddedToast'), 'warning');
    speak(tr('form.timeAlreadyAddedSpeech'));
  }
}

// Refresca el preview grande y los números del selector manual.
function renderManualTime() {
  const preview = document.getElementById('time-preview');
  const hourEl  = document.getElementById('manual-hour-val');
  const minEl   = document.getElementById('manual-min-val');
  if (preview) preview.textContent = formatTimeFromParts(manualHour, manualMinute);
  if (hourEl)  hourEl.textContent  = pad(((manualHour % 24) + 24) % 24);
  if (minEl)   minEl.textContent   = pad(((manualMinute % 60) + 60) % 60);
}

function stepManualHour(delta) {
  manualHour = ((manualHour + delta) % 24 + 24) % 24;
  renderManualTime();
}

function stepManualMinute(delta) {
  manualMinute = ((manualMinute + delta) % 60 + 60) % 60;
  renderManualTime();
}

// Botón "Agregar esta hora" del selector manual.
function addManualTime() {
  const time = formatTimeFromParts(manualHour, manualMinute);
  if (addTimeIfNew(time)) {
    renderTimesInForm();
    showToast(tr('form.manualAddedToast', { time }), 'success');
    speak(tr('form.manualAddedSpeech', { time }));
  } else {
    showToast(tr('form.timeAlreadyAddedToast'), 'warning');
    speak(tr('form.timeAlreadyAddedSpeech'));
  }
}

async function saveMedicineForm(e) {
  e.preventDefault();

  const name     = sanitize(document.getElementById('f-name')?.value     || '');
  const dose     = sanitize(document.getElementById('f-dose')?.value     || '');
  const notes    = sanitize(document.getElementById('f-notes')?.value    || '');
  const freq     = document.getElementById('f-freq')?.value    || 'diario';
  const priority = document.getElementById('f-priority')?.value || 'normal';
  const selected = document.querySelector('.color-swatch.selected');
  const color    = selected ? selected.dataset.color : TAG_COLORS[0];

  if (!name) {
    showToast(tr('form.nameRequiredToast'), 'error');
    speak(tr('form.nameRequiredSpeech'));
    return;
  }
  if (name.length > MAX_NAME_LEN) {
    showToast(tr('form.nameTooLongToast'), 'error');
    speak(tr('form.nameTooLongSpeech'));
    return;
  }
  if (dose.length > MAX_DOSE_LEN) {
    showToast(tr('form.doseTooLongToast'), 'error');
    speak(tr('form.doseTooLongSpeech'));
    return;
  }
  if (notes.length > MAX_NOTES_LEN) {
    showToast(tr('form.notesTooLongToast'), 'error');
    speak(tr('form.notesTooLongSpeech'));
    return;
  }
  if (formTimes.length === 0) {
    showToast(tr('form.addAtLeastOneTimeToast'), 'error');
    speak(tr('form.addAtLeastOneTimeSpeech'));
    return;
  }
  // Validar cada horario y deduplicar antes de guardar
  for (const t of formTimes) {
    if (!TIME_RE.test(t)) {
      showToast(tr('form.invalidTimeToast'), 'error');
      speak(tr('form.invalidTimeSpeech'));
      return;
    }
  }
  const times = [...new Set(formTimes)].sort();
  if (!VALID_FREQUENCIES.includes(freq)) {
    showToast(tr('form.invalidFreqToast'), 'error');
    return;
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    showToast(tr('form.invalidPriorityToast'), 'error');
    return;
  }
  if (!TAG_COLORS.includes(color)) {
    showToast(tr('form.invalidColorToast'), 'error');
    return;
  }

  if (editMedId) {
    // Edit existing
    const med = state.medicines.find(m => m.id === editMedId);
    if (med) {
      med.name      = name;
      med.dose      = dose;
      med.notes     = notes;
      med.times     = times;
      med.frequency = freq;
      med.priority  = priority;
      med.color     = color;
    }
    showToast(tr('meds.updatedToast', { name }), 'success');
    speak(tr('meds.updatedSpeech', { name }));
  } else {
    // New
    const med = createMedicine({ name, dose, notes, times, frequency: freq, priority, color });
    state.medicines.push(med);
    showToast(tr('meds.savedToast', { name }), 'success');
    speak(tr('meds.savedSpeech', { name }));
    playSound('confirmacion');
  }

  saveState();
  editMedId = null;
  hideFormPanel();
  renderMedicineList();
  const notifResult = await syncNativeNotifications();
  if (_LocalNotifications && notifResult) {
    if (notifResult.ok && notifResult.scheduledCount > 0) {
      showToast(tr('meds.notifScheduled', { time: notifResult.nextAt }), 'success');
    } else if (!notifResult.ok && notifResult.error && notifResult.error !== 'permission_denied') {
      showToast(tr('meds.notifScheduleFailed'), 'warning');
    }
  }
}

function deleteMedicine(id) {
  const med = state.medicines.find(m => m.id === id);
  if (!med) return;
  showConfirmModal(
    tr('meds.deleteConfirm', { name: med.name }),
    () => {
      state.medicines = state.medicines.filter(m => m.id !== id);
      saveState();
      syncNativeNotifications().catch(() => {});
      playSound('error');
      showToast(tr('meds.deletedToast', { name: med.name }), 'warning');
      speak(tr('meds.deletedSpeech', { name: med.name }));
      renderMedicineList();
      if (currentView === 'inicio') renderInicio();
    }
  );
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

  // Marca si la pulsación larga llegó a activar el SOS. Evita que la pista
  // "Mantén pulsado…" salga tras una activación correcta (la suelta posterior).
  let holdActivated = false;

  const startHold = () => {
    if (sosHoldTimer) return;
    holdActivated = false;
    btn.classList.add('holding');
    sosHoldTimer = setTimeout(() => {
      sosHoldTimer = null;
      holdActivated = true;            // activado: la suelta no debe mostrar pista
      btn.classList.remove('holding');
      navigateTo('sos');
    }, SOS_HOLD_MS);
  };

  const cancelHold = (showHint) => {
    // Ya se activó por pulsación larga: consumir la suelta sin mostrar pista.
    if (holdActivated) {
      holdActivated = false;
      return;
    }
    if (!sosHoldTimer) return;          // nunca iniciado
    clearTimeout(sosHoldTimer);
    sosHoldTimer = null;
    btn.classList.remove('holding');
    if (showHint) {                     // soltó antes del umbral → guía al usuario
      showToast(tr('sos.holdHintToast'), 'warning');
      speak(tr('sos.holdHintSpeech'));
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
  const banner = document.getElementById('sos-practice-banner');
  if (banner) banner.hidden = !sosPractice;
  getGPS();
  startSOSCountdown();
  if (sosPractice) {
    speak(tr('sos.practiceActivatedSpeech'));
  } else {
    speak(tr('sos.activatedSpeech'));
  }
}

// Abre la pantalla SOS en modo práctica: nunca marca ni llama a emergencias.
function openPracticeSOS() {
  sosPractice = true;
  navigateTo('sos');
}

// ── Helpers de ubicación SOS ──────────────────────────────────────────────
// Las coordenadas solo se muestran dentro de la pantalla SOS y solo se guardan
// localmente (state.sos.lastKnownLocation). Nunca se envían a ningún servidor.

// Valida la forma {lat, lng, accuracy, ts}: coordenadas numéricas en rango.
function isValidLocation(loc) {
  return !!loc
    && typeof loc === 'object'
    && typeof loc.lat === 'number' && isFinite(loc.lat)
    && typeof loc.lng === 'number' && isFinite(loc.lng)
    && loc.lat >= -90  && loc.lat <= 90
    && loc.lng >= -180 && loc.lng <= 180;
}

// Persiste la última posición GPS válida y la devuelve normalizada.
function saveLastKnownLocation(pos) {
  if (!pos || !pos.coords) return null;
  const loc = {
    lat:      pos.coords.latitude,
    lng:      pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    ts:       Date.now(),
  };
  if (!state.sos) state.sos = { lastKnownLocation: null };
  state.sos.lastKnownLocation = loc;
  saveState();
  return loc;
}

// Etiqueta de antigüedad legible ("hace 5 min"). Nunca lanza ante ts inválido.
function getLocationAgeLabel(ts, now) {
  if (typeof ts !== 'number' || !isFinite(ts)) return '';
  const ref  = typeof now === 'number' ? now : Date.now();
  const diff = ref - ts;
  if (diff < 0) return '';
  if (diff < 60_000) return tr('sos.justNow');
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return tr('sos.minAgo', { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return tr('sos.hourAgo', { n: hrs });
  const days = Math.round(hrs / 24);
  return tr(days !== 1 ? 'sos.daysAgo' : 'sos.dayAgo', { n: days });
}

function renderSOSLoading(box) {
  if (!box) return;
  clearElement(box);
  box.textContent = tr('sos.obtainingSignal');
}

function renderSOSError(box, message) {
  if (!box) return;
  clearElement(box);
  box.textContent = message;
}

// mode: 'fresh' (fix actual) | 'last-known' (última ubicación guardada)
function renderSOSLocation(box, location, mode) {
  if (!box) return;
  clearElement(box);
  if (!isValidLocation(location)) {
    box.textContent = tr('sos.locationUnavailable');
    return;
  }
  const lat = location.lat.toFixed(5);
  const lng = location.lng.toFixed(5);

  if (mode === 'last-known') {
    const label = document.createElement('div');
    label.style.fontWeight = '700';
    const age = getLocationAgeLabel(location.ts);
    label.textContent = tr('sos.lastKnownLabel') + (age ? ' · ' + age : '');
    box.appendChild(label);
  }

  const latLine = document.createElement('div');
  latLine.textContent = 'LAT: ' + lat;
  const lngLine = document.createElement('div');
  lngLine.textContent = 'LON: ' + lng;
  box.appendChild(latLine);
  box.appendChild(lngLine);

  if (typeof location.accuracy === 'number' && isFinite(location.accuracy)) {
    const accLine = document.createElement('div');
    accLine.style.fontSize = '0.8em';
    accLine.style.opacity  = '0.7';
    accLine.textContent    = tr('sos.accuracyLabel', { m: Math.round(location.accuracy) });
    box.appendChild(accLine);
  }
}

function getGPS() {
  const box = document.getElementById('sos-location');
  if (!box) return;
  renderSOSLoading(box);

  if (!navigator.geolocation) {
    renderSOSError(box, tr('sos.gpsUnavailable'));
    return;
  }

  let resolved = false;   // ¿llegó ya una respuesta (fix u error) del GPS?

  // Si en 3 s no hay fix fresco y existe última ubicación, mostrarla como
  // puente. La cuenta atrás y la llamada nunca dependen de esto.
  const fallbackTimer = setTimeout(() => {
    if (resolved) return;
    const last = state.sos && state.sos.lastKnownLocation;
    if (isValidLocation(last)) renderSOSLocation(box, last, 'last-known');
  }, 3000);

  navigator.geolocation.getCurrentPosition(
    pos => {
      resolved = true;
      clearTimeout(fallbackTimer);
      const loc = saveLastKnownLocation(pos);   // un fix fresco reemplaza el puente
      renderSOSLocation(box, loc, 'fresh');
      speak(tr('sos.locationObtainedSpeech', { lat: loc.lat.toFixed(5), lng: loc.lng.toFixed(5) }));
    },
    err => {
      resolved = true;
      clearTimeout(fallbackTimer);
      // Sin fix fresco: si hay última ubicación conocida, mostrarla.
      const last = state.sos && state.sos.lastKnownLocation;
      if (isValidLocation(last)) {
        renderSOSLocation(box, last, 'last-known');
        return;
      }
      const msgs = {
        1: tr('sos.permissionDenied'),
        2: tr('sos.signalUnavailable'),
        3: tr('sos.timeoutError'),
      };
      const msg = (msgs[err.code] || tr('sos.unknownError')) + tr('sos.enableLocationHint');
      renderSOSError(box, msg);
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
    if (statusEl) statusEl.textContent = tr(count !== 1 ? 'sos.callingInPlural' : 'sos.callingIn', { count });
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
  // En práctica nunca se abre el marcador ni se llama a emergencias.
  if (sosPractice) {
    const statusEl = document.getElementById('sos-status');
    if (statusEl) statusEl.textContent = tr('sos.practiceNoCallStatus');
    speak(tr('sos.practiceNoCallSpeech'));
    return;
  }
  const num = sanitizePhone(state.settings.sosNumber) || '911';
  const statusEl = document.getElementById('sos-status');
  if (statusEl) statusEl.textContent = tr('sos.dialing', { number: num });
  speak(tr('sos.callingNowSpeech'));
  const btn = document.getElementById('sos-call-btn');
  if (btn) {
    btn.href = 'tel:' + num;
    btn.click();   // más fiable que window.location.href en WebViews de Android
  }
}

function cancelSOS() {
  clearSOS();
  speak(tr('sos.cancelledSpeech'));
  showToast(tr('sos.cancelledToast'), 'warning');
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
  const subtitleEl = document.getElementById('history-subtitle');
  if (subtitleEl) subtitleEl.textContent = tr('history.subtitle', { days: HISTORY_DAYS });
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
    return tr('history.noRecordsSpeech');
  }
  return tr('history.summarySpeech', { days: HISTORY_DAYS, taken, skipped, snoozed });
}

function renderHistoryStats() {
  const container = document.getElementById('history-stats');
  if (!container) return;
  clearElement(container);

  const taken   = state.history.filter(e => e.action === 'taken').length;
  const skipped = state.history.filter(e => e.action === 'skipped').length;
  const snoozed = state.history.filter(e => e.action === 'snoozed').length;

  const stats = [
    { value: taken,   label: tr('history.taken'),   color: 'var(--success)' },
    { value: skipped, label: tr('history.skipped'),  color: 'var(--danger)'  },
    { value: snoozed, label: tr('history.snoozed'), color: 'var(--warning)' },
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
  clearElement(container);

  if (state.history.length === 0) {
    const p = document.createElement('p');
    p.textContent = tr('history.empty');
    p.style.textAlign = 'center';
    p.style.color = 'var(--text-muted)';
    p.style.padding = '32px';
    container.appendChild(p);
    return;
  }

  const icons   = { taken: '✅', skipped: '❌', snoozed: '⏰' };
  const actions = { taken: tr('history.actionTaken'), skipped: tr('history.actionSkipped'), snoozed: tr('history.actionSnoozed') };

  state.history.slice(0, 60).forEach(entry => {
    const row = document.createElement('div');
    row.className = 'history-entry';
    row.setAttribute('aria-label', tr('history.entryAriaLabel', { name: entry.medName, action: actions[entry.action] || entry.action }));

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
    ts.textContent = d.toLocaleDateString(LANG, { day: '2-digit', month: 'short' }) + '\n' +
                     d.toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit' });
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
  title.textContent = tr('print.reportTitle');
  header.appendChild(title);

  const lines = [];
  if (state.profile.name) {
    lines.push(state.profile.age
      ? tr('print.patientLineAge', { name: state.profile.name, age: state.profile.age })
      : tr('print.patientLine', { name: state.profile.name }));
  }
  if (state.profile.doctorName) lines.push(tr('print.doctorLine', { name: state.profile.doctorName }));
  lines.push(tr('print.period', { days: HISTORY_DAYS }));
  lines.push(tr('print.generated', {
    date: new Date().toLocaleDateString(LANG, { day: '2-digit', month: 'long', year: 'numeric' }),
  }));

  lines.forEach(l => {
    const p = document.createElement('p');
    p.textContent = l;
    header.appendChild(p);
  });
}

function shareWithDoctor() {
  buildPrintHeader();
  speak(tr('history.shareSpeech'));
  window.print();
}

// ══════════════════════════════════════════════════════════
// SETTINGS VIEW
// ══════════════════════════════════════════════════════════
function populateSettings() {
  setSelectValue('s-language', state.settings.language || 'auto');
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
  setToggle('s-senior-toggle',   state.settings.seniorMode);

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
  const rawSnooze = parseInt(document.getElementById('s-snooze-time')?.value, 10);
  state.settings.snoozeMinutes = Number.isFinite(rawSnooze) && rawSnooze > 0 ? rawSnooze : 10;

  state.settings.ttsEnabled   = getToggle('s-tts-toggle');
  state.settings.highContrast = getToggle('s-contrast-toggle');
  state.settings.bigFont      = getToggle('s-bigfont-toggle');
  state.settings.darkMode     = getToggle('s-dark-toggle');
  state.settings.doubleTap    = getToggle('s-doubletap-toggle');
  state.settings.notifEnabled = getToggle('s-notif-toggle');
  state.settings.seniorMode   = getToggle('s-senior-toggle');

  applySettings();
  saveState();
  showToast(tr('settings.savedToast'), 'success');
  speak(tr('settings.savedSpeech'));

  // Request notification permission if enabled
  if (state.settings.notifEnabled && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') {
        state.settings.notifEnabled = false;
        setToggle('s-notif-toggle', false);
        saveState();
        showToast(tr('settings.notifPermissionDeniedToast'), 'error');
      }
    });
  }

  if (state.settings.notifEnabled) maybeWarnExactAlarm();
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
  clearElement(list);

  if (state.contacts.length === 0) {
    const p = document.createElement('p');
    p.style.color = 'var(--text-muted)';
    p.style.fontSize = '0.88rem';
    p.textContent = tr('settings.contactsEmpty');
    list.appendChild(p);
    return;
  }

  state.contacts.forEach(c => {
    const row = document.createElement('div');
    row.className = 'contact-item';
    row.setAttribute('aria-label', tr('settings.contactItemAriaLabel', { name: c.name, phone: c.phone }));

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
    delBtn.setAttribute('aria-label', tr('settings.contactDeleteAriaLabel', { name: c.name }));
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
    showToast(tr('settings.contactRequiredToast'), 'error');
    return;
  }
  state.contacts.push({ id: String(Date.now()), name, phone });
  saveState();
  if (nameEl)  nameEl.value  = '';
  if (phoneEl) phoneEl.value = '';
  renderContacts();
  showToast(tr('settings.contactAddedToast', { name }), 'success');
  speak(tr('settings.contactAddedSpeech', { name }));
}

function removeContact(id) {
  const c = state.contacts.find(x => x.id === id);
  if (!c) return;
  showConfirmModal(
    tr('settings.contactDeleteConfirm', { name: c.name }),
    () => {
      state.contacts = state.contacts.filter(x => x.id !== id);
      saveState();
      renderContacts();
      showToast(tr('settings.contactDeletedToast', { name: c.name }), 'warning');
    }
  );
}

function clearAllData() {
  showConfirmModal(
    tr('settings.clearConfirm1'),
    () => {
      showConfirmModal(
        tr('settings.clearConfirm2'),
        async () => {
          if (_SecureStorage) {
            try { await _SecureStorage.remove({ key: STORAGE_KEY }); } catch (_) {}
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
          showToast(tr('settings.clearedToast'), 'warning');
          setTimeout(() => location.reload(), 1500);
        }
      );
    }
  );
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
      const label = target.getAttribute('aria-label') || target.textContent.trim().slice(0, 40) || tr('a11y.genericButton');
      speak(tr('a11y.doubleTapHintSpeech', { label }));
      showToast(tr('a11y.doubleTapHintToast', { label: label.slice(0, 40) }), '');
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
  clearElement(container);

  TAG_COLORS.forEach((color, i) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch' + (i === 0 ? ' selected' : '');
    swatch.style.background = color;
    swatch.dataset.color = color;
    swatch.setAttribute('aria-label', tr('form.colorAriaLabel', { n: i + 1 }));
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

// ── Confirm Modal ─────────────────────────────────────────────────────────────
// Reemplaza window.confirm(), que es bloqueado silenciosamente en muchos
// WebViews de Android y en modo PWA standalone. Acepta mensaje y dos callbacks.
let _confirmCallback = null;
let _cancelCallback  = null;

function showConfirmModal(msg, onConfirm, onCancel) {
  const modal = document.getElementById('confirm-modal');
  const msgEl = document.getElementById('confirm-modal-msg');
  if (!modal || !msgEl) { if (typeof onConfirm === 'function') onConfirm(); return; }
  msgEl.textContent    = msg;
  _confirmCallback     = onConfirm || null;
  _cancelCallback      = onCancel  || null;
  modal.hidden         = false;
  document.getElementById('btn-confirm-cancel')?.focus();
}

function _resolveConfirmModal(accepted) {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.hidden = true;
  const cb = accepted ? _confirmCallback : _cancelCallback;
  _confirmCallback = null;
  _cancelCallback  = null;
  if (typeof cb === 'function') cb();
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
      speak(state.settings.ttsEnabled ? tr('a11y.ttsOnSpeech') : '');
      showToast(state.settings.ttsEnabled ? tr('a11y.ttsOnToast') : tr('a11y.ttsOffToast'), '');
    });
  }

  // Add medicine button
  const btnAddMed = document.getElementById('btn-add-med');
  if (btnAddMed) btnAddMed.addEventListener('click', openAddForm);

  // Cancel form
  const btnCancel = document.getElementById('btn-cancel-form');
  if (btnCancel) btnCancel.addEventListener('click', () => { speak(tr('form.cancelledSpeech')); hideFormPanel(); });

  // Add time button (opción avanzada: hora actual)
  const btnAddTime = document.getElementById('btn-add-time');
  if (btnAddTime) btnAddTime.addEventListener('click', addTimeToForm);

  // Botones de rutina (Mañana, Mediodía, Tarde, Noche, Antes de dormir)
  document.querySelectorAll('.time-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => addPresetTime(btn.dataset.time, btn.dataset.preset || ''));
  });

  // Selector manual con + / −
  const wireStep = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };
  wireStep('btn-hour-minus', () => stepManualHour(-1));
  wireStep('btn-hour-plus',  () => stepManualHour(1));
  wireStep('btn-min-minus',  () => stepManualMinute(-5));
  wireStep('btn-min-plus',   () => stepManualMinute(5));
  const btnAddManual = document.getElementById('btn-add-manual-time');
  if (btnAddManual) btnAddManual.addEventListener('click', addManualTime);
  renderManualTime();

  // Práctica sin riesgo
  const btnPracticeAlarm = document.getElementById('btn-practice-alarm');
  if (btnPracticeAlarm) btnPracticeAlarm.addEventListener('click', openPracticeAlarm);
  const btnPracticeSOS = document.getElementById('btn-practice-sos');
  if (btnPracticeSOS) btnPracticeSOS.addEventListener('click', openPracticeSOS);

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
  if (sosCallBtn) sosCallBtn.addEventListener('click', (e) => {
    // En práctica el botón no abre el marcador: solo recuerda que es un simulacro.
    if (sosPractice) {
      e.preventDefault();
      const statusEl = document.getElementById('sos-status');
      if (statusEl) statusEl.textContent = tr('sos.practiceNoCallStatus');
      speak(tr('sos.practiceNoCallSpeech'));
      return;
    }
    sosCallBtn.href = 'tel:' + (sanitizePhone(state.settings.sosNumber) || '911');
  });

  // Settings — toggle buttons
  // Cada toggle se aplica y se guarda AL INSTANTE: el usuario ve el efecto
  // (modo oscuro, letra grande…) en el momento del toque, sin "Guardar ajustes".
  // `on`/`off` guardan la CLAVE de traducción, no el texto ya resuelto: si se
  // resolviera aquí con tr(), el anuncio quedaría fijado al idioma que estaba
  // activo al arrancar la app y no cambiaría tras un cambio de idioma en caliente.
  const toggleConfig = {
    's-tts-toggle':       { key: 'ttsEnabled',   on: 'a11y.ttsOnSpeech',      off: 'a11y.ttsOffSpeech' },
    's-contrast-toggle':  { key: 'highContrast', on: 'a11y.contrastOnSpeech', off: 'a11y.contrastOffSpeech' },
    's-bigfont-toggle':   { key: 'bigFont',      on: 'a11y.bigFontOnSpeech',  off: 'a11y.bigFontOffSpeech' },
    's-dark-toggle':      { key: 'darkMode',     on: 'a11y.darkOnSpeech',     off: 'a11y.darkOffSpeech' },
    's-doubletap-toggle': { key: 'doubleTap',    on: 'a11y.doubleTapOnSpeech', off: 'a11y.doubleTapOffSpeech' },
    's-notif-toggle':     { key: 'notifEnabled', on: 'a11y.notifOnSpeech',    off: 'a11y.notifOffSpeech' },
    's-senior-toggle':    { key: 'seniorMode',   on: 'a11y.seniorOnSpeech',   off: 'a11y.seniorOffSpeech' },
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
      speak(tr(next ? cfg.on : cfg.off));

      state.settings[cfg.key] = next;
      applySettings();
      saveState();

      // Al activar notificaciones, pedir el permiso en ese momento
      if (cfg.key === 'notifEnabled' && next && _LocalNotifications) {
        syncNativeNotifications().catch(() => {});
        maybeWarnExactAlarm();
      } else if (cfg.key === 'notifEnabled' && next &&
          'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          if (perm !== 'granted') {
            state.settings.notifEnabled = false;
            setToggle('s-notif-toggle', false);
            saveState();
            showToast(tr('settings.notifPermissionDeniedToast'), 'error');
          }
        });
      }
    });
  });

  // Settings — revisar/activar alarmas exactas de Android
  const btnExact = document.getElementById('s-exact-alarm-btn');
  if (btnExact) btnExact.addEventListener('click', reviewExactAlarms);

  // Settings — probar alarma nativa (Task 2) y diagnóstico (Task 3)
  const btnNativeTest = document.getElementById('btn-native-alarm-test');
  if (btnNativeTest) btnNativeTest.addEventListener('click', scheduleNativeAlarmTest);
  const btnDiag = document.getElementById('btn-notif-diagnostics');
  if (btnDiag) btnDiag.addEventListener('click', showNotifDiagnostics);

  // Idioma — cambia en caliente, sin recargar la app
  const langSelect = document.getElementById('s-language');
  if (langSelect) langSelect.addEventListener('change', () => setLanguage(langSelect.value));

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

  // Confirm modal buttons
  const btnConfirmOk     = document.getElementById('btn-confirm-ok');
  const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
  if (btnConfirmOk)     btnConfirmOk.addEventListener('click',     () => _resolveConfirmModal(true));
  if (btnConfirmCancel) btnConfirmCancel.addEventListener('click', () => _resolveConfirmModal(false));

  // Keyboard: close modals on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const alarmModal = document.getElementById('alarm-modal');
      if (alarmModal && !alarmModal.hidden) { closeAlarmModal(); return; }
      const confirmModal = document.getElementById('confirm-modal');
      if (confirmModal && !confirmModal.hidden) _resolveConfirmModal(false);
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
  await preloadI18nFallback();

  // Biometric gate runs inside loadState(). If auth fails,
  // _showLockScreen() is injected and we return immediately —
  // nothing below executes until the user retries.
  await loadState();
  if (document.getElementById('lock-overlay')) return;

  await initI18n();
  applySettings();
  buildColorPicker();
  wireEvents();
  setupDoubleTap();
  startClock();
  resetDailyConfirmed();
  renderInicio();
  startReminderLoop();
  registerNotificationListeners();
  ensureMedicineAlarmChannel();
  syncNativeNotifications().catch(() => {});
  handleShortcut();

  if ('Notification' in window && state.settings.notifEnabled) {
    Notification.requestPermission();
  }

  // Si ya hay notificaciones activas pero faltan las alarmas exactas, avisar una
  // vez (la causa típica de avisos que llegan tarde). No bloquea ni se repite.
  if (state.settings.notifEnabled) maybeWarnExactAlarm();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }

  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');
  }, 900);

  setTimeout(() => speak(getGreeting() + '. ' + tr('greeting.welcome')), 1200);
}

document.addEventListener('DOMContentLoaded', () => { init(); });
