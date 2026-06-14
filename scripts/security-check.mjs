#!/usr/bin/env node
/**
 * security-check.mjs
 * Análisis estático ligero de seguridad para MediTime.
 * Solo usa la librería estándar de Node.js.
 *
 * - Falla (exit 1) ante patrones peligrosos: eval(, new Function(, document.write(
 * - Advierte (no falla) ante innerHTML
 * - Exige una meta Content-Security-Policy en index.html
 *
 * Salida: 0 si solo hay advertencias, 1 si hay patrones peligrosos.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_DIR = join(ROOT, 'MediTime_Web');

const SCAN_FILES = [join(WEB_DIR, 'app.js'), join(WEB_DIR, 'index.html')];

const DANGEROUS = [
  { label: 'eval(', re: /\beval\s*\(/g },
  { label: 'new Function(', re: /\bnew\s+Function\s*\(/g },
  { label: 'document.write(', re: /\bdocument\s*\.\s*write\s*\(/g },
];
const WARN = [{ label: 'innerHTML', re: /\binnerHTML\b/g }];

const dangerHits = [];
const warnHits = [];

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

// Reemplaza el contenido de los comentarios por espacios, conservando los
// saltos de línea (y por tanto las posiciones/números de línea). Así se evitan
// falsos positivos cuando un comentario menciona "eval()" o "innerHTML".
function blankComments(code, isHtml) {
  const blank = m => m.replace(/[^\n]/g, ' ');
  let out = code;
  if (isHtml) out = out.replace(/<!--[\s\S]*?-->/g, blank);
  out = out.replace(/\/\*[\s\S]*?\*\//g, blank); // bloque /* ... */
  // línea // ... (sin tocar esquemas tipo http://, https://)
  out = out.replace(/(^|[^:])(\/\/[^\n]*)/gm, (_m, p1, p2) => p1 + blank(p2));
  return out;
}

for (const file of SCAN_FILES) {
  if (!existsSync(file)) {
    console.error(`❌ Archivo a escanear ausente: ${file}`);
    process.exit(1);
  }
  const rel = relative(ROOT, file);
  const content = blankComments(readFileSync(file, 'utf8'), file.endsWith('.html'));

  for (const { label, re } of DANGEROUS) {
    for (const m of content.matchAll(re)) {
      dangerHits.push(`${rel}:${lineOf(content, m.index)} → ${label}`);
    }
  }
  for (const { label, re } of WARN) {
    for (const m of content.matchAll(re)) {
      warnHits.push(`${rel}:${lineOf(content, m.index)} → ${label}`);
    }
  }
}

// ── CSP en index.html ────────────────────────────────────────────────────────
const indexPath = join(WEB_DIR, 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');
const hasCSP =
  /<meta[^>]+http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(indexHtml);
if (!hasCSP) {
  dangerHits.push('index.html → falta la meta Content-Security-Policy');
}

// ── Resultado ───────────────────────────────────────────────────────────────
if (warnHits.length > 0) {
  console.warn('⚠️  Advertencias (innerHTML — revisa que no use datos del usuario):');
  for (const w of warnHits) console.warn('  • ' + w);
  console.warn('');
}

if (dangerHits.length > 0) {
  console.error('❌ Patrones peligrosos detectados:');
  for (const d of dangerHits) console.error('  • ' + d);
  console.error(`\n${dangerHits.length} problema(s) crítico(s).`);
  process.exit(1);
}

console.log('✅ Seguridad estática correcta (CSP presente, sin patrones peligrosos).');
process.exit(0);
