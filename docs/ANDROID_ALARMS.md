# Alarmas de Android — sonido con la app cerrada

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

- **Canal v3** (`MediTime_Web/app.js → ensureMedicineAlarmChannel()`):
  - id: `meditime_medicine_alarms_v3`  ← subido de v2 para forzar nuevo canal con el nuevo sonido
  - nombre: "Alarmas de medicamentos"
  - importancia `5` (alta/máxima), visibilidad `1` (pública), vibración y luces.
  - sonido: `meditime_alarm_v3.wav` (15 s, 5× el original)
- **Cada notificación** lleva `channelId`, `sound` (respaldo Android 7.x),
  `allowWhileIdle: true`, `autoCancel: false` y `extra` con `medId`, `time`,
  `kind` (para abrir la dosis correcta al tocarla).
- **Programación con fechas concretas** (one-shot) para ~14 días por toma, en vez
  de repeticiones indefinidas: nunca se entrega una toma "rancia" tarde y las
  pendientes son auditables. Nunca se agenda en el pasado ni dentro de los
  próximos 60 s.
- **syncNativeNotifications()** ahora retorna `{ ok, scheduledCount, nextAt, exactAlarmStatus, error? }`
  y el formulario de guardar medicina muestra un toast con la próxima alarma agendada.
- **Alarmas exactas**: `checkExactAlarmSupport()` consulta el estado y, si está
  denegado, se avisa una vez y se ofrece abrir los ajustes
  (`changeExactNotificationSetting()`). Botón en Ajustes: **"Revisar alarmas exactas"**.
- **Botón "Probar alarma nativa en 3 minutos"** (`scheduleNativeAlarmTest()`):
  agenda una notificación de prueba (id 990001) para exactamente 3 min en el futuro
  usando el canal y sonido de producción. Bloquear la pantalla y esperar confirma
  si el sistema nativo funciona, desacoplado del modal/WebAudio en-app.
- **"Ver diagnóstico de alarmas"** (`showNotifDiagnostics()`): muestra permiso,
  estado de alarmas exactas, canal activo, conteo de pendientes y las próximas 5
  notificaciones con hora y canal.

## Archivo de sonido (importante)

Los sonidos del canal viven en:

```
android/app/src/main/res/raw/meditime_alarm.wav      ← original ~3 s (se conserva)
android/app/src/main/res/raw/meditime_alarm_v3.wav   ← generado por scripts/generate-alarm-sound.mjs (~15 s)
android/app/src/main/res/raw/prealerta.wav           ← sonido de pre-alerta (capacitor.config.json)
```

- Los nombres de recursos Android deben ir **en minúsculas con guion bajo**.
- `meditime_alarm_v3.wav` se genera con `node scripts/generate-alarm-sound.mjs`
  (repite el original × 5, PCM 8-bit mono 44.1 kHz).
- Android reproduce el sonido del canal **una vez** por notificación; un archivo
  más largo da más tiempo de sonido antes de que el sistema lo corte.
- Para un bucle infinito real sería necesario un `AlarmManager` + `BroadcastReceiver`
  + `full-screen AlarmActivity` nativo (roadmap futuro).
- Para **cambiar el sonido en el futuro**: reemplaza el `.wav` **y** sube el id
  del canal (`_v3` → `_v4`, etc.). Android **cachea** los ajustes del canal: un
  canal ya creado ignora el nuevo sonido. Alternativa al probar en dispositivo:
  desinstalar/reinstalar la app.

## Ajustes recomendados en Android (paso a paso)

### Batería sin restricciones (crítico en Samsung, Xiaomi, Huawei)
- **Samsung**: Ajustes → Aplicaciones → MediTime PRO → Batería → **Sin restricciones**
- **Android estándar**: Ajustes → Aplicaciones → MediTime → Batería → **Sin restricciones**
- Xiaomi/MIUI: Ajustes → Aplicaciones → Administrar aplicaciones → MediTime → Ahorro de energía → Sin restricciones

### Sonido del canal
- Ajustes → Notificaciones → MediTime (o desde la notificación larga pulsada)
  → **Alarmas de medicamentos** → Sonido: **activado**

### Alarmas exactas (Android 12+)
- Ajustes → Aplicaciones → **Alarmas y recordatorios** → MediTime → Activar
- O usa el botón **"Revisar alarmas exactas"** en la sección Notificaciones de la app.

## Pruebas en dispositivo real (obligatorias)

El sonido de fondo y la exactitud **no se pueden validar en navegador**: hay que
probarlo en un Android real.

1. Usa el botón **"Probar alarma nativa en 3 minutos"** → bloquea la pantalla → espera.
2. Si suena: el canal nativo funciona.
3. Si NO suena: revisar batería sin restricciones, sonido del canal, alarmas exactas.
4. App **cerrada** y pantalla **bloqueada** → la alarma **suena** (prueba con medicina real).
5. App en **segundo plano** → la alarma **suena**.
6. App **abierta** → aparece el modal y suena el sonido en-app.
7. **Tocar** la notificación abre la app y muestra el modal de la dosis pendiente.
8. Una dosis cuya hora ya pasó **no** se entrega tarde (no se agenda en pasado).
9. Con **alarmas exactas desactivadas** aparece la guía y el botón para activarlas.

## Notas de plataforma

- Android 8+ (API 26): sonido vía **canal** (`channelId`).
- Android 7.x: sonido vía campo `sound` de cada notificación (respaldo incluido).
- Android 12+ (API 31): `SCHEDULE_EXACT_ALARM` declarado en el manifiesto; el
  usuario debe **conceder** alarmas exactas para horas precisas.
- Fabricantes (Samsung, Xiaomi, Huawei…) tienen optimizaciones de batería
  agresivas que pueden retrasar alarmas: **excluir MediTime del ahorro de batería**.
