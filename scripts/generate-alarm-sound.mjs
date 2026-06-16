/**
 * generate-alarm-sound.mjs
 *
 * Genera meditime_alarm_v3.wav repitiendo meditime_alarm.wav 5 veces (~15 s).
 * Android reproduce el sonido del canal UNA VEZ al entregar la notificación;
 * un archivo más largo significa más tiempo de sonido antes de que Android lo corte.
 *
 * Uso:
 *   node scripts/generate-alarm-sound.mjs
 *
 * Entrada:  android/app/src/main/res/raw/meditime_alarm.wav
 * Salida:   android/app/src/main/res/raw/meditime_alarm_v3.wav
 *
 * Nota: NO promete un bucle infinito. Para una alarma persistente real se
 * necesita un AlarmManager + BroadcastReceiver + full-screen AlarmActivity
 * nativo (roadmap futuro).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const INPUT  = join(root, 'android/app/src/main/res/raw/meditime_alarm.wav');
const OUTPUT = join(root, 'android/app/src/main/res/raw/meditime_alarm_v3.wav');
const REPEAT = 5;

const src = readFileSync(INPUT);

if (src.toString('ascii', 0, 4) !== 'RIFF') throw new Error('Input is not a RIFF file: ' + INPUT);
if (src.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Input is not a WAVE file: ' + INPUT);

// Scan chunks to locate fmt and data
let fmtData  = null;
let dataOffset = -1;
let dataSize   = 0;

let pos = 12;
while (pos + 8 <= src.length) {
  const id   = src.toString('ascii', pos, pos + 4);
  const size = src.readUInt32LE(pos + 4);
  if (id === 'fmt ') {
    fmtData = src.slice(pos + 8, pos + 8 + size);
  } else if (id === 'data') {
    dataOffset = pos + 8;
    dataSize   = Math.min(size, src.length - (pos + 8));
    break;
  }
  pos += 8 + size + (size % 2 !== 0 ? 1 : 0);  // word-aligned
}

if (!fmtData)       throw new Error('No fmt chunk found in ' + INPUT);
if (dataOffset < 0) throw new Error('No data chunk found in ' + INPUT);

// fmt chunk layout (PCM):
//  [0-1]  audio format (1 = PCM)
//  [2-3]  num channels
//  [4-7]  sample rate
//  [8-11] byte rate
//  [12-13] block align
//  [14-15] bits per sample
const numChannels  = fmtData.readUInt16LE(2);
const sampleRate   = fmtData.readUInt32LE(4);
const bitsPerSample = fmtData.readUInt16LE(14);
const byteRate     = sampleRate * numChannels * (bitsPerSample / 8);
const inputDuration = dataSize / byteRate;

const audioData = src.slice(dataOffset, dataOffset + dataSize);
const repeated  = Buffer.concat(Array.from({ length: REPEAT }, () => audioData));

// Build output WAV: RIFF header + fmt chunk + data chunk (drop any other chunks)
const fmtChunkSize  = fmtData.length;
const dataChunkSize = repeated.length;
// "WAVE" (4) + "fmt " chunk (8 + fmtChunkSize) + "data" chunk (8 + dataChunkSize)
const riffSize = 4 + (8 + fmtChunkSize) + (8 + dataChunkSize);

const out = Buffer.alloc(8 + riffSize);

// RIFF header
out.write('RIFF', 0);
out.writeUInt32LE(riffSize, 4);
out.write('WAVE', 8);

// fmt chunk
out.write('fmt ', 12);
out.writeUInt32LE(fmtChunkSize, 16);
fmtData.copy(out, 20);

// data chunk
const dataPos = 20 + fmtChunkSize;
out.write('data', dataPos);
out.writeUInt32LE(dataChunkSize, dataPos + 4);
repeated.copy(out, dataPos + 8);

writeFileSync(OUTPUT, out);

const outputDuration = inputDuration * REPEAT;
console.log('Input:  ' + INPUT);
console.log('  ' + sampleRate + ' Hz · ' + numChannels + 'ch · ' + bitsPerSample + '-bit · ' + inputDuration.toFixed(2) + 's');
console.log('Output: ' + OUTPUT);
console.log('  Repeated x' + REPEAT + ' → ' + outputDuration.toFixed(2) + 's  (' + out.length + ' bytes)');
