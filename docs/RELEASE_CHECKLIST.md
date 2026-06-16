# ✅ Checklist de release y pruebas — MediTime PRO

## Quality gates (locales)

```bash
npm run check          # security:check + validate:pwa + test + build
npm run icons          # genera iconos de la app
npx cap sync android   # sincroniza web → proyecto Android
cd android && ./gradlew assembleDebug
```

> Nota: si Gradle falla por bloqueos de archivos de OneDrive (node_modules /
> .gradle), ciérralos/pausa la sincronización y reintenta. No muevas el repo
> automáticamente.

## Pruebas en dispositivo real

- [ ] Añadir medicina
- [ ] Editar medicina
- [ ] Eliminar medicina
- [ ] La alarma suena con la app abierta
- [ ] La alarma suena con la pantalla bloqueada
- [ ] Comportamiento de la alarma con ahorro de batería
- [ ] Confirmar dosis
- [ ] Deshacer confirmación
- [ ] Posponer dosis
- [ ] Saltar dosis
- [ ] El historial se actualiza correctamente
- [ ] SOS solo se activa con pulsación larga
- [ ] Un toque corto de SOS **no** activa la emergencia
- [ ] SOS con fix de GPS fresco
- [ ] SOS con respaldo de última ubicación conocida
- [ ] Cancelar SOS antes de la cuenta atrás
- [ ] El botón de llamada SOS abre el marcador
- [ ] Alternar TTS (lectura por voz)
- [ ] Alto contraste
- [ ] Fuente grande
- [ ] Modo oscuro
- [ ] Borrar datos

## Alarmas y sonido en Android (ver `docs/ANDROID_ALARMS.md`)

> El sonido de fondo y la exactitud **solo** se validan en un dispositivo real.

- [ ] App **cerrada** + pantalla **bloqueada** → la alarma **suena**
- [ ] App en **segundo plano** → la alarma **suena**
- [ ] App **abierta** → aparece el modal y suena el sonido en-app
- [ ] **Tocar** la notificación abre la app y muestra el modal de la dosis
- [ ] Una dosis con hora ya pasada **no** se entrega tarde
- [ ] Con **alarmas exactas desactivadas** aparece la guía y el botón para activarlas
- [ ] Botón **"Revisar alarmas exactas"** en Ajustes abre los ajustes de Android
- [ ] Excluir MediTime del **ahorro de batería** (evitar suspensión profunda)
- [ ] Sonido del canal presente en `android/app/src/main/res/raw/meditime_alarm.wav`
- [ ] Al cambiar el sonido, subir el id del canal (`_v2` → `_v3`) o reinstalar

## Preparación para Play Store

- [ ] Generar AAB firmado (release)
- [ ] Subir la política de privacidad a una URL pública
- [ ] Rellenar el formulario de Seguridad de los datos (Data Safety)
- [ ] Completar la clasificación de contenido (content rating)
- [ ] Añadir capturas de pantalla
- [ ] Evitar coordenadas reales / datos de pacientes en las capturas
      (ver `docs/PLAYSTORE_SCREENSHOTS.md`)
- [ ] Pruebas cerradas / internas antes de producción
