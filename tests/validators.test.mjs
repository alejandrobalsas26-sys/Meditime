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
