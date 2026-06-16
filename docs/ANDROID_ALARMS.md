# 🔔 Alarmas de Android — sonido con la app cerrada

Guía para que las alarmas de medicamentos **suenen** aunque la app esté cerrada
o la pantalla bloqueada, y lleguen **a la hora exacta**.

## Por qué a veces el aviso aparecía mudo o tarde

Se observó en un dispositivo real que la notificación aparecía en la barra
("morfina · 12mg a las 18:00") pero **sin sonido de alarma** con la app cerrada,
y a veces **tarde** (≈18:45). Dos causas:

1. **Sonido**: en Android 8+ el sonido lo define el **canal de notificación**, no
   cada aviso. Sin un canal con sonido, la notificación aparece muda y el sonido
   solo se oía al abrir la app (WebAudio en primer plano).
2. **Hora**: sin permiso de **alarmas exactas** (Android 12+) el sistema puede
   agrupar/retrasar los avisos para ahorrar batería.

## Cómo está resuelto en el código

- **Canal con sonido** (`MediTime_Web/app.js → ensureMedicineAlarmChannel()`):
  - id: `meditime_medicine_alarms_v2`
  - nombre: "Alarmas de medicamentos"
  - importancia `5` (alta/máxima), visibilidad `1` (pública), vibración y luces.
  - sonido: `meditime_alarm.wav`
- **Cada notificación** lleva `channelId`, `sound` (respaldo Android 7.x),
  `allowWhileIdle: true`, `autoCancel: false` y `extra` con `medId`, `time`,
  `kind` (para abrir la dosis correcta al tocarla).
- **Programación con fechas concretas** (one-shot) para ~14 días por toma, en vez
  de repeticiones indefinidas: nunca se entrega una toma "rancia" tarde y las
  pendientes son auditables. Nunca se agenda en el pasado ni dentro de los
  próximos 60 s.
- **Alarmas exactas**: `checkExactAlarmSupport()` consulta el estado y, si está
  denegado, se avisa una vez y se ofrece abrir los ajustes
  (`changeExactNotificationSetting()`). Botón en Ajustes: **"Revisar alarmas
  exactas"**.

## Archivo de sonido (importante)

El sonido del canal vive en:

```
android/app/src/main/res/raw/meditime_alarm.wav
```

- Los nombres de recursos Android deben ir **en minúsculas con guion bajo**.
- Hoy `meditime_alarm.wav` es una copia de `MediTime_Web/assets/urgente.wav`
  (PCM 8-bit, mono, 44.1 kHz, ≈3 s). También se copió `prealerta.wav` a `res/raw`
  porque `capacitor.config.json` lo usa como sonido por defecto.
- Para **cambiar el sonido**: reemplaza el `.wav` **y** sube el id del canal
  (`meditime_medicine_alarms_v2` → `_v3`). Android **cachea** los ajustes del
  canal: un canal ya creado ignora el nuevo sonido. Alternativa al probar:
  desinstalar/reinstalar la app.

## Pruebas en dispositivo real (obligatorias)

El sonido de fondo y la exactitud **no se pueden validar en navegador**: hay que
probarlo en un Android real.

1. App **cerrada** y pantalla **bloqueada** → la alarma **suena**.
2. App en **segundo plano** → la alarma **suena**.
3. App **abierta** → aparece el modal y suena el sonido en-app.
4. **Tocar** la notificación abre la app y muestra el modal de la dosis pendiente.
5. Una dosis cuya hora ya pasó **no** se entrega tarde (no se agenda en pasado).
6. Con **alarmas exactas desactivadas** aparece la guía y el botón para activarlas.
7. **Ahorro de batería / suspensión profunda** puede retrasar alarmas: documentar
   al usuario que excluya MediTime de la optimización de batería.

## Notas de plataforma

- Android 8+ (API 26): sonido vía **canal** (`channelId`).
- Android 7.x: sonido vía campo `sound` de cada notificación (respaldo incluido).
- Android 12+ (API 31): `SCHEDULE_EXACT_ALARM` declarado en el manifiesto; el
  usuario debe **conceder** alarmas exactas para horas precisas.
- Fabricantes (Samsung, Xiaomi, Huawei…) tienen optimizaciones de batería
  agresivas que pueden retrasar alarmas: recomendar excluir la app.
