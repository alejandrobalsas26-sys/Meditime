#!/usr/bin/env node
/**
 * export-debug-apk.mjs
 * Copia el APK debug generado por Gradle a dist/ con nombre legible y
 * genera un archivo de checksum SHA-256 junto a él.
 *
 * Uso:
 *   npm run android:export-apk
 *   node scripts/export-debug-apk.mjs
 *
 * Prerrequisito: el APK debe existir en
 *   android/app/build/outputs/apk/debug/app-debug.apk
 * Si no existe, genera primero:
 *   npm run android:debug
 *
 * Este script NUNCA sube nada, nunca usa git y nunca requiere credenciales.
 * Salida: dist/MediTime-PRO-v<version>-debug.apk
 *         dist/MediTime-PRO-v<version>-debug.apk.sha256
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Lee la versión desde package.json para no hardcodear
const pkg     = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version; // ej. "3.0.0"

const APK_NAME  = `MediTime-PRO-v${VERSION}-debug.apk`;
const SRC       = join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const DIST_DIR  = join(ROOT, 'dist');
const DEST      = join(DIST_DIR, APK_NAME);
const DEST_SHA  = DEST + '.sha256';

// ── 1. Verificar que el APK fue generado ─────────────────────────────────────
if (!existsSync(SRC)) {
  console.error('');
  console.error('❌ APK debug no encontrado en:');
  console.error('   ' + SRC);
  console.error('');
  console.error('   Genera el APK primero con:');
  console.error('     npm run android:debug');
  console.error('');
  console.error('   O el flujo completo (sync + build + export):');
  console.error('     npm run android:whatsapp-apk');
  console.error('');
  process.exit(1);
}

// ── 2. Crear dist/ si no existe ───────────────────────────────────────────────
if (!existsSync(DIST_DIR)) {
  mkdirSync(DIST_DIR, { recursive: true });
  console.log('📁 Directorio dist/ creado.');
}

// ── 3. Copiar el APK ──────────────────────────────────────────────────────────
copyFileSync(SRC, DEST);

// ── 4. Calcular SHA-256 ───────────────────────────────────────────────────────
const bytes  = readFileSync(SRC);
const sha256 = createHash('sha256').update(bytes).digest('hex');
// Formato estándar sha256sum: "<hash>  <nombre de archivo>"
writeFileSync(DEST_SHA, sha256 + '  ' + APK_NAME + '\n', 'utf8');

// ── 5. Imprimir resultado ─────────────────────────────────────────────────────
console.log('');
console.log('✅ APK exportado correctamente.');
console.log('');
console.log('📦 Archivo APK:');
console.log('   ' + DEST);
console.log('');
console.log('🔑 SHA-256:');
console.log('   ' + DEST_SHA);
console.log('   ' + sha256);
console.log('');
console.log('📲 Cómo enviarlo por WhatsApp:');
console.log('   1. Abre WhatsApp en el PC (web o app de escritorio).');
console.log('   2. Abre el chat contigo mismo ("Mensajes guardados")');
console.log('      o el chat con el destinatario.');
console.log('   3. Presiona el clip 📎 → "Documento" → selecciona:');
console.log('   4. dist/' + APK_NAME);
console.log('');
console.log('📱 Cómo instalar en el teléfono:');
console.log('   1. Descarga el APK desde WhatsApp en el teléfono.');
console.log('   2. Abre el archivo descargado (Android pedirá habilitar');
console.log('      "Instalar aplicaciones de orígenes desconocidos").');
console.log('   3. Permite la instalación → instala → abre la app.');
console.log('');
console.log('⚠️  Este APK es DEBUG — solo para pruebas internas.');
console.log('   Para Play Store se necesita un AAB firmado:');
console.log('   npm run android:bundle  (requiere signing.properties)');
console.log('');
