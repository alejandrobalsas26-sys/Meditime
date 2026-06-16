/**
 * validators.test.mjs — Node.js built-in test runner (node --test).
 *
 * Estos validadores reflejan los usados en MediTime_Web/app.js
 * (TIME_RE, VALID_FREQUENCIES, VALID_PRIORITIES) y en el saneamiento
 * de delimitadores del almacenamiento pipe-delimited del proyecto Java.
 * Se mantienen aquí como contrato verificable de la lógica de validación.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Mirrors de la lógica de la app ───────────────────────────────────────────
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_FREQUENCIES = ['diario', 'semana', 'finde', 'alterno'];
const VALID_PRIORITIES = ['normal', 'urgente'];

// Saneamiento de delimitadores peligrosos del formato pipe-delimited
function sanitizeDelimiters(input) {
  if (input == null) return '';
  return String(input).replace(/[|\n\r\t]/g, ' ');
}

// Mirror de isValidLocation() de app.js — valida {lat, lng, accuracy, ts}.
function isValidLocation(loc) {
  return !!loc
    && typeof loc === 'object'
    && typeof loc.lat === 'number' && isFinite(loc.lat)
    && typeof loc.lng === 'number' && isFinite(loc.lng)
    && loc.lat >= -90  && loc.lat <= 90
    && loc.lng >= -180 && loc.lng <= 180;
}

// Mirror de getLocationAgeLabel() de app.js — etiqueta de antigüedad legible.
function getLocationAgeLabel(ts, now) {
  if (typeof ts !== 'number' || !isFinite(ts)) return '';
  const ref  = typeof now === 'number' ? now : Date.now();
  const diff = ref - ts;
  if (diff < 0) return '';
  if (diff < 60_000) return 'hace instantes';
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return 'hace ' + mins + ' min';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return 'hace ' + hrs + ' h';
  const days = Math.round(hrs / 24);
  return 'hace ' + days + ' día' + (days !== 1 ? 's' : '');
}

// Mirror de nextAlternateDates() de app.js (cadencia de días alternos)
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

// Mirror de formatTimeFromParts() de app.js — construye "HH:mm" con envolvente.
function formatTimeFromParts(hour, minute) {
  const pad = (n) => String(n).padStart(2, '0');
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  const m = ((Math.trunc(minute) % 60) + 60) % 60;
  return pad(h) + ':' + pad(m);
}

// Mirror de addTimeIfNew() de app.js — no añade horas duplicadas.
function addTimeIfNew(times, time) {
  if (times.includes(time)) return false;
  times.push(time);
  return true;
}

// Mirror de PRESET_TIMES de app.js — rutinas frecuentes.
const PRESET_TIMES = [
  { emoji: '🌅', label: 'Mañana',          time: '08:00' },
  { emoji: '☀️', label: 'Mediodía',        time: '12:00' },
  { emoji: '🌇', label: 'Tarde',           time: '18:00' },
  { emoji: '🌙', label: 'Noche',           time: '21:00' },
  { emoji: '🛏️', label: 'Antes de dormir', time: '22:00' },
];

// ── Horas válidas ─────────────────────────────────────────────────────────────
test('TIME_RE acepta horas HH:mm válidas', () => {
  for (const t of ['00:00', '08:30', '14:05', '23:59']) {
    assert.ok(TIME_RE.test(t), `${t} debería ser válida`);
  }
});

test('TIME_RE rechaza horas inválidas', () => {
  for (const t of ['24:00', '99:99', '12:60', 'ab:cd', '7pm']) {
    assert.ok(!TIME_RE.test(t), `${t} debería ser inválida`);
  }
});

// ── Selector de hora sencillo (adultos mayores) ───────────────────────────────
test('formatTimeFromParts devuelve siempre formato HH:mm válido', () => {
  assert.equal(formatTimeFromParts(8, 0), '08:00');
  assert.equal(formatTimeFromParts(8, 30), '08:30');
  assert.equal(formatTimeFromParts(0, 5), '00:05');
  assert.equal(formatTimeFromParts(23, 55), '23:55');
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 5, 30, 55]) {
      assert.ok(TIME_RE.test(formatTimeFromParts(h, m)), `${h}:${m} debería dar HH:mm válido`);
    }
  }
});

test('formatTimeFromParts envuelve las horas 00–23', () => {
  assert.equal(formatTimeFromParts(24, 0), '00:00');  // 24 → 00
  assert.equal(formatTimeFromParts(25, 0), '01:00');
  assert.equal(formatTimeFromParts(-1, 0), '23:00');  // bajar de 00 → 23
});

test('formatTimeFromParts envuelve los minutos en pasos de 5', () => {
  assert.equal(formatTimeFromParts(8, 60), '08:00');   // 60 → 00
  assert.equal(formatTimeFromParts(8, -5), '08:55');   // bajar de 00 → 55
  assert.equal(formatTimeFromParts(8, 55), '08:55');
});

test('las horas predefinidas (presets) son válidas según TIME_RE', () => {
  for (const p of PRESET_TIMES) {
    assert.ok(TIME_RE.test(p.time), `${p.label} (${p.time}) debería ser válida`);
  }
});

test('addTimeIfNew no añade horas duplicadas', () => {
  const times = [];
  assert.equal(addTimeIfNew(times, '08:00'), true);
  assert.equal(addTimeIfNew(times, '08:00'), false); // duplicado → no se añade
  assert.equal(addTimeIfNew(times, '12:00'), true);
  assert.deepEqual(times, ['08:00', '12:00']);
});

// ── Whitelist de frecuencias ──────────────────────────────────────────────────
test('VALID_FREQUENCIES acepta los valores conocidos', () => {
  for (const f of ['diario', 'semana', 'finde', 'alterno']) {
    assert.ok(VALID_FREQUENCIES.includes(f));
  }
});

test('VALID_FREQUENCIES rechaza valores desconocidos', () => {
  for (const f of ['mensual', 'random', '', 'DIARIO']) {
    assert.ok(!VALID_FREQUENCIES.includes(f));
  }
});

// ── Whitelist de prioridades ──────────────────────────────────────────────────
test('VALID_PRIORITIES acepta los valores conocidos', () => {
  for (const p of ['normal', 'urgente']) {
    assert.ok(VALID_PRIORITIES.includes(p));
  }
});

test('VALID_PRIORITIES rechaza valores desconocidos', () => {
  for (const p of ['alta', 'baja', '', 'URGENTE']) {
    assert.ok(!VALID_PRIORITIES.includes(p));
  }
});

// ── Saneamiento de delimitadores ──────────────────────────────────────────────
test('sanitizeDelimiters elimina pipe, salto de línea, retorno de carro y tab', () => {
  assert.equal(sanitizeDelimiters('a|b'), 'a b');
  assert.equal(sanitizeDelimiters('a\nb'), 'a b');
  assert.equal(sanitizeDelimiters('a\rb'), 'a b');
  assert.equal(sanitizeDelimiters('a\tb'), 'a b');
  assert.equal(sanitizeDelimiters('x|y\nz\tw'), 'x y z w');
  assert.ok(!/[|\n\r\t]/.test(sanitizeDelimiters('todo|junto\n\r\tmezclado')));
});

// ── Validación de ubicación SOS ───────────────────────────────────────────────
test('isValidLocation acepta coordenadas válidas en rango', () => {
  for (const loc of [
    { lat: 0, lng: 0, accuracy: 10, ts: Date.now() },
    { lat: 40.4168, lng: -3.7038, accuracy: 25, ts: Date.now() },
    { lat: -90, lng: 180, accuracy: 0, ts: 1 },
    { lat: 90, lng: -180, accuracy: 5, ts: 1 },
  ]) {
    assert.ok(isValidLocation(loc), JSON.stringify(loc) + ' debería ser válida');
  }
});

test('isValidLocation rechaza lat/lng inválidos o fuera de rango', () => {
  for (const loc of [
    { lat: 91, lng: 0 },
    { lat: -91, lng: 0 },
    { lat: 0, lng: 181 },
    { lat: 0, lng: -181 },
    { lat: 'a', lng: 0 },
    { lat: 0, lng: 'b' },
    { lat: NaN, lng: 0 },
    { lat: 0, lng: Infinity },
  ]) {
    assert.ok(!isValidLocation(loc), JSON.stringify(loc) + ' debería ser inválida');
  }
});

test('isValidLocation rechaza valores nulos o no-objeto', () => {
  for (const loc of [null, undefined, '', 0, 'lat,lng', []]) {
    assert.ok(!isValidLocation(loc));
  }
});

test('getLocationAgeLabel no lanza y devuelve cadena para ts válido o inválido', () => {
  const now = Date.parse('2026-06-14T12:00:00Z');
  assert.equal(typeof getLocationAgeLabel(now, now), 'string');
  assert.equal(getLocationAgeLabel(now - 30_000, now), 'hace instantes');
  assert.equal(getLocationAgeLabel(now - 5 * 60_000, now), 'hace 5 min');
  assert.equal(getLocationAgeLabel(now - 3 * 3_600_000, now), 'hace 3 h');
  assert.equal(getLocationAgeLabel(now - 2 * 86_400_000, now), 'hace 2 días');
  // Entradas inválidas o futuras → cadena vacía, nunca excepción
  for (const bad of [null, undefined, NaN, Infinity, 'x', now + 60_000]) {
    assert.equal(getLocationAgeLabel(bad, now), '');
  }
});

// ── Cadencia de días alternos ─────────────────────────────────────────────────
test('nextAlternateDates genera fechas separadas exactamente 2 días', () => {
  const createdAt = new Date('2026-01-01T00:00:00').getTime();
  const from = new Date('2026-01-10T00:00:00').getTime();
  const dates = nextAlternateDates(createdAt, 8, 0, 5, from);

  assert.equal(dates.length, 5);
  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round((dates[i] - dates[i - 1]) / 86_400_000);
    assert.equal(diffDays, 2, 'cada toma debe ir 2 días después de la anterior');
  }
  // Todas las fechas deben ser futuras respecto a `from`
  for (const d of dates) assert.ok(d.getTime() > from);
});

test('nextAlternateDates respeta la paridad respecto a createdAt', () => {
  const createdAt = new Date('2026-01-01T00:00:00').getTime();
  const createdDay = Math.floor(createdAt / 86_400_000);
  const from = new Date('2026-02-01T00:00:00').getTime();
  const dates = nextAlternateDates(createdAt, 9, 30, 4, from);
  for (const d of dates) {
    const dayIndex = Math.floor(d.getTime() / 86_400_000);
    assert.equal((dayIndex - createdDay) % 2, 0);
  }
});

// ── Parseo de "HH:mm" (parseTimeParts) ────────────────────────────────────────
// Mirror de parseTimeParts() de app.js — divide "HH:mm" o devuelve null.
function parseTimeParts(time) {
  if (typeof time !== 'string') return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

// Mirror de shouldSkipPastDate() de app.js.
function shouldSkipPastDate(date, now = Date.now()) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return true;
  return date.getTime() <= now + 60_000;
}

// Mirror de nextDailyDates() de app.js (próximas tomas diarias, todas futuras).
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

test('parseTimeParts acepta horas HH:mm válidas y devuelve [h, m]', () => {
  assert.deepEqual(parseTimeParts('00:00'), [0, 0]);
  assert.deepEqual(parseTimeParts('08:30'), [8, 30]);
  assert.deepEqual(parseTimeParts('23:59'), [23, 59]);
});

test('parseTimeParts rechaza entradas inválidas con null', () => {
  for (const bad of ['24:00', '12:60', '7:05', '08:5', '7pm', '', '0800', null, undefined, 800]) {
    assert.equal(parseTimeParts(bad), null, `${bad} debería dar null`);
  }
});

test('parseTimeParts acepta todas las horas predefinidas (presets)', () => {
  for (const p of PRESET_TIMES) {
    assert.ok(parseTimeParts(p.time), `${p.label} (${p.time}) debería parsearse`);
  }
});

// ── Próximas tomas diarias (nextDailyDates) ───────────────────────────────────
test('nextDailyDates nunca devuelve fechas pasadas', () => {
  const now = new Date('2026-03-10T14:00:00').getTime();
  const dates = nextDailyDates(8, 0, 5, now);
  for (const d of dates) assert.ok(d.getTime() > now, d + ' debería ser futura');
});

test('nextDailyDates: si la hora de hoy ya pasó, la primera toma es mañana', () => {
  const now = new Date('2026-03-10T14:00:00').getTime(); // 14:00, dosis a las 08:00
  const first = nextDailyDates(8, 0, 3, now)[0];
  assert.equal(first.getDate(), 11);    // día siguiente
  assert.equal(first.getHours(), 8);
  assert.equal(first.getMinutes(), 0);
});

test('nextDailyDates: si la hora de hoy aún no llega, la primera toma es hoy', () => {
  const now = new Date('2026-03-10T06:00:00').getTime(); // 06:00, dosis a las 08:00
  const first = nextDailyDates(8, 0, 3, now)[0];
  assert.equal(first.getDate(), 10);    // mismo día
  assert.equal(first.getHours(), 8);
});

test('nextDailyDates devuelve fechas en orden ascendente, separadas 1 día', () => {
  const now = new Date('2026-03-10T06:00:00').getTime();
  const dates = nextDailyDates(8, 0, 6, now);
  for (let i = 1; i < dates.length; i++) {
    assert.ok(dates[i] > dates[i - 1], 'cada fecha debe ir después de la anterior');
    const diffDays = Math.round((dates[i] - dates[i - 1]) / 86_400_000);
    assert.equal(diffDays, 1);
  }
});

test('nextDailyDates limita la cantidad al count pedido', () => {
  const now = new Date('2026-03-10T06:00:00').getTime();
  assert.equal(nextDailyDates(8, 0, 14, now).length, 14);
  assert.equal(nextDailyDates(8, 0, 1, now).length, 1);
});
