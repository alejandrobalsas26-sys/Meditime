#!/usr/bin/env node
/**
 * generate-icons.mjs
 * Genera los iconos PWA y los launcher de Android a partir de un icono fuente.
 * Requiere `sharp` (devDependency).
 *
 * Fuente: MediTime_Web/source-icon.png
 * Si la fuente no existe, imprime un aviso claro y sale con código 0
 * (no es un error: el icono todavía está en diseño).
 */
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'MediTime_Web', 'source-icon.png');

if (!existsSync(SOURCE)) {
  console.warn(
    '⚠️  No se encontró MediTime_Web/source-icon.png.\n' +
      '    Coloca ahí el icono fuente (idealmente 1024×1024 PNG) y vuelve a ejecutar:\n' +
      '    npm run icons'
  );
  process.exit(0);
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error(
    '❌ No se pudo cargar "sharp". Instálalo con:\n   npm install --save-dev sharp'
  );
  process.exit(1);
}

// ── Iconos PWA ───────────────────────────────────────────────────────────────
const PWA_SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512];
const PWA_DIR = join(ROOT, 'MediTime_Web', 'icons');

// ── Launcher de Android (mipmap) ─────────────────────────────────────────────
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const ANDROID_DENSITIES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function render(size, outPath) {
  await sharp(SOURCE)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(outPath);
  console.log('  ✓ ' + outPath.replace(ROOT + '\\', '').replace(ROOT + '/', ''));
}

async function main() {
  console.log('Generando iconos PWA…');
  ensureDir(PWA_DIR);
  for (const size of PWA_SIZES) {
    await render(size, join(PWA_DIR, `icon-${size}.png`));
  }

  console.log('Generando launcher de Android…');
  for (const { dir, size } of ANDROID_DENSITIES) {
    const outDir = join(ANDROID_RES, dir);
    ensureDir(outDir);
    await render(size, join(outDir, 'ic_launcher.png'));
    await render(size, join(outDir, 'ic_launcher_round.png'));
  }

  console.log('✅ Iconos generados correctamente.');
}

main().catch(err => {
  console.error('❌ Error al generar iconos: ' + err.message);
  process.exit(1);
});
