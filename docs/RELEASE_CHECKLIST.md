# ✅ Checklist de release y pruebas — MediTime PRO

## Quality gates (locales)

```bash
npm run check                  # security:check + validate:pwa + test + build
npm run icons                  # genera iconos de la app
npm run android:release-check  # cap sync + assembleDebug (verifica el build)
npm run android:bundle         # bundleRelease (requiere signing.properties)
```

Scripts individuales:
```bash
npm run android:sync   # npx cap sync android
npm run android:debug  # gradlew assembleDebug
npm run android:bundle # gradlew bundleRelease (necesita credenciales de firma)
```

> **SDK:** compileSdk 35 / targetSdk 35 / minSdk 22. Requiere Android SDK 35
> instalado en Android Studio (SDK Manager → Android 15 / API 35).

> **Nota:** si Gradle falla por bloqueos de archivos de OneDrive (node_modules /
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

- [ ] Botón **"Probar alarma nativa en 3 minutos"** → bloquear pantalla → esperar que suene
- [ ] App **cerrada** + pantalla **bloqueada** → la alarma **suena**
- [ ] App en **segundo plano** → la alarma **suena**
- [ ] App **abierta** → aparece el modal y suena el sonido en-app
- [ ] **Tocar** la notificación abre la app y muestra el modal de la dosis
- [ ] Una dosis con hora ya pasada **no** se entrega tarde
- [ ] Con **alarmas exactas desactivadas** aparece la guía y el botón para activarlas
- [ ] Botón **"Revisar alarmas exactas"** en Ajustes abre los ajustes de Android
- [ ] MediTime configurado como **batería sin restricciones** (Samsung: Ajustes → Apps → MediTime PRO → Batería → Sin restricciones)
- [ ] Canal **Alarmas de medicamentos** con sonido activado en Android
- [ ] Sonido v3 presente en `android/app/src/main/res/raw/meditime_alarm_v3.wav` (~15 s)
- [ ] Al cambiar el sonido en el futuro, subir el id del canal (`_v3` → `_v4`) o reinstalar
- [ ] Si no suena: revisar batería sin restricciones → sonido del canal → alarmas exactas

## Preparación para Play Store

- [ ] Generar AAB firmado (release)
- [ ] Subir la política de privacidad a una URL pública
- [ ] Rellenar el formulario de Seguridad de los datos (Data Safety)
- [ ] Completar la clasificación de contenido (content rating)
- [ ] Añadir capturas de pantalla
- [ ] Evitar coordenadas reales / datos de pacientes en las capturas
      (ver `docs/PLAYSTORE_SCREENSHOTS.md`)
- [ ] Pruebas cerradas / internas antes de producción
