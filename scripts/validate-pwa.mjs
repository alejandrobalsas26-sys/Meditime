#!/usr/bin/env node
/**
 * validate-pwa.mjs
 * Valida el manifest PWA y el precache del Service Worker de MediTime.
 * Solo usa la librería estándar de Node.js.
 *
 * Salida: 0 si todo es válido, 1 si hay errores.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_DIR = join(ROOT, 'MediTime_Web');
const MANIFEST_PATH = join(WEB_DIR, 'manifest.json');
const SW_PATH = join(WEB_DIR, 'service-worker.js');

const errors = [];

// ── Manifest ──────────────────────────────────────────────────────────────
const REQUIRED_FIELDS = [
  'name',
  'short_name',
  'start_url',
  'scope',
  'display',
  'theme_color',
  'icons',
];

let manifest = null;
if (!existsSync(MANIFEST_PATH)) {
  errors.push(`No se encontró el manifest: ${MANIFEST_PATH}`);
} else {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (e) {
    errors.push(`manifest.json no es JSON válido: ${e.message}`);
  }
}

if (manifest) {
  for (const field of REQUIRED_FIELDS) {
    const value = manifest[field];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);
    if (missing) {
      errors.push(`Falta el campo obligatorio del manifest: "${field}"`);
    }
  }

  // Verificar que cada icono declarado exista en disco
  if (Array.isArray(manifest.icons)) {
    for (const icon of manifest.icons) {
      if (!icon || !icon.src) {
        errors.push('Hay un icono en el manifest sin propiedad "src".');
        continue;
      }
      const iconPath = join(WEB_DIR, icon.src);
      if (!existsSync(iconPath)) {
        errors.push(`Icono declarado en el manifest pero ausente: ${icon.src}`);
      }
    }
  }
}

// ── Service Worker precache ─────────────────────────────────────────────────
if (!existsSync(SW_PATH)) {
  errors.push(`No se encontró el service worker: ${SW_PATH}`);
} else {
  const sw = readFileSync(SW_PATH, 'utf8');
  const match = sw.match(/PRECACHE_URLS\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    errors.push('No se pudo localizar PRECACHE_URLS en service-worker.js');
  } else {
    const urls = [...match[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
    if (urls.length === 0) {
      errors.push('PRECACHE_URLS está vacío.');
    }
    for (const url of urls) {
      // Ignorar URLs absolutas/remotas; solo validamos archivos locales
      if (/^https?:\/\//i.test(url)) continue;
      const filePath = join(WEB_DIR, url);
      if (!existsSync(filePath)) {
        errors.push(`Archivo precacheado pero ausente en MediTime_Web/: ${url}`);
      }
    }
  }
}

// ── Resultado ───────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error('❌ Validación PWA FALLIDA:\n');
  for (const err of errors) console.error('  • ' + err);
  console.error(`\n${errors.length} error(es) encontrado(s).`);
  process.exit(1);
}

console.log('✅ Validación PWA correcta: manifest y precache íntegros.');
process.exit(0);
