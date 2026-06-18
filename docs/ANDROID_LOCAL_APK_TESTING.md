# MediTime PRO — Pruebas locales con APK (WhatsApp / sideload)

> Guía para generar un APK de prueba, exportarlo a `dist/` y enviarlo al
> teléfono sin pasar por Google Play.
>
> **Solo Android. No cubre iOS ni App Store.**

---

## ¿Por qué APK debug y no Play Store?

| Flujo          | Propósito                           | Firma        | Play Store |
|----------------|-------------------------------------|--------------|------------|
| **APK debug**  | Probar cambios rápidamente en casa  | Debug (auto) | ❌ No apto |
| **AAB firmado**| Publicar en Google Play             | Tu keystore  | ✅ Requerido |

El APK debug lo firma Android Studio/Gradle automáticamente con una clave de
desarrollo. Se puede instalar en cualquier teléfono Android habilitando
"fuentes desconocidas". **No sirve para subir a Play Store.**

Para Play Store necesitas un AAB firmado con tu keystore. Ver `docs/ANDROID_SIGNING.md`.

---

## Flujo completo en un solo comando

```bash
npm run android:whatsapp-apk
```

Este comando hace exactamente tres cosas en orden:
1. `npm run android:sync` — sincroniza la web a Android (`npx cap sync android`).
2. `npm run android:debug` — compila el APK debug con Gradle (`./gradlew.bat --no-daemon assembleDebug`).
3. `npm run android:export-apk` — copia el APK a `dist/` y genera el SHA-256.

Al final imprime la ruta exacta del APK exportado.

---

## Flujo paso a paso (si necesitas hacer algo distinto)

### Paso 1 — Sincronizar los cambios web a Android

```bash
npm run android:sync
```

Equivale a `npx cap sync android`. Copia `MediTime_Web/` dentro de los
assets del proyecto Android y actualiza los plugins de Capacitor.

**Ejecuta esto siempre que modifiques archivos en `MediTime_Web/`.**

### Paso 2 — Generar el APK debug

```bash
npm run android:debug
```

Equivale a `cd android && ./gradlew.bat --no-daemon assembleDebug`.

- No requiere `signing.properties` ni credenciales.
- Salida en: `android/app/build/outputs/apk/debug/app-debug.apk`
- Tiempo aproximado: 1–3 minutos (la primera vez, más; Gradle descarga dependencias).

> **OneDrive:** si el build falla con errores de archivo bloqueado, pausa la
> sincronización de OneDrive mientras compila y vuelve a ejecutar el comando.
> No mueves el repositorio — solo pausa OneDrive.

### Paso 3 — Exportar el APK a dist/

```bash
npm run android:export-apk
```

- Fuente: `android/app/build/outputs/apk/debug/app-debug.apk`
- Destino: `dist/MediTime-PRO-v3.0.0-debug.apk`
- Checksum: `dist/MediTime-PRO-v3.0.0-debug.apk.sha256`
- El script falla con mensaje claro si el APK no existe (ejecuta el paso 2 antes).
- La carpeta `dist/` está en `.gitignore` — nunca se sube al repositorio.

---

## Enviar por WhatsApp

### Desde el PC (WhatsApp Web / app de escritorio)

1. Abre [web.whatsapp.com](https://web.whatsapp.com) o la app de escritorio.
2. Abre el chat contigo mismo ("Mensajes guardados") o el chat con el receptor.
3. Haz clic en el icono de clip 📎 → elige **"Documento"**.
4. Navega a la carpeta `dist/` del proyecto y selecciona `MediTime-PRO-v3.0.0-debug.apk`.
5. Envía.

> WhatsApp permite adjuntar archivos `.apk` como documentos hasta ~100 MB.
> Un APK debug de MediTime suele pesar ~10–15 MB.

### Desde el móvil (como alternativa)

Si el PC y el móvil comparten OneDrive, el APK en `dist/` estará disponible
directamente en el teléfono a través del almacenamiento de OneDrive.

---

## Instalar el APK en el teléfono Android

1. **Descarga el APK** desde el chat de WhatsApp en el teléfono
   (toca el documento → descargar).

2. **Habilita fuentes desconocidas** (solo la primera vez):
   - Android 8+: Ajustes → Apps → WhatsApp → Permisos →
     "Instalar aplicaciones desconocidas" → Permitir.
   - Android 7 o inferior: Ajustes → Seguridad → "Orígenes desconocidos" → Activar.

3. **Abre el archivo descargado** desde la notificación de descarga o desde
   la carpeta "Descargas".

4. Toca **Instalar** → toca **Abrir** cuando termine.

> Si ya hay una versión instalada, Android la reemplazará si el APK debug se
> firma con la misma clave de debug. La clave de debug es la misma mientras
> no reinstales Android Studio.

---

## Verificar el checksum (opcional)

Para confirmar que el APK no se corrompió durante la transferencia, el script
genera `dist/MediTime-PRO-v3.0.0-debug.apk.sha256`.

En Git Bash o PowerShell:

```bash
# Git Bash
sha256sum dist/MediTime-PRO-v3.0.0-debug.apk
cat dist/MediTime-PRO-v3.0.0-debug.apk.sha256

# PowerShell
Get-FileHash dist\MediTime-PRO-v3.0.0-debug.apk -Algorithm SHA256
Get-Content dist\MediTime-PRO-v3.0.0-debug.apk.sha256
```

Los dos hashes deben ser idénticos.

---

## ¿Por qué Play Store necesita un AAB firmado?

| Criterio                       | APK debug                    | AAB firmado (release)        |
|-------------------------------|------------------------------|------------------------------|
| Firma                         | Clave de debug (auto)        | Tu keystore personal         |
| Instalar desde WhatsApp       | ✅ Sí                        | ❌ No (Play Store lo distribuye) |
| Subir a Play Console          | ❌ Rechazado                 | ✅ Requerido                 |
| Optimizado por Google Play    | ❌ No                        | ✅ Sí (App Bundle)           |
| Modo de depuración activo     | ✅ Sí (logs, debugger)       | ❌ No (más rápido)           |

Para generar el AAB firmado:

```bash
# 1. Crea android/signing.properties desde la plantilla (ver docs/ANDROID_SIGNING.md)
# 2. Genera el AAB:
npm run android:bundle
# Salida: android/app/build/outputs/bundle/release/app-release.aab
# 3. Sube app-release.aab a Play Console → Pruebas internas
```

---

## Referencia de scripts

| Script                        | Descripción                                              |
|-------------------------------|----------------------------------------------------------|
| `npm run android:sync`        | Sincroniza web → Android (`npx cap sync android`)        |
| `npm run android:debug`       | Compila APK debug (`./gradlew.bat --no-daemon assembleDebug`) |
| `npm run android:bundle`      | Compila AAB release (requiere `signing.properties`)      |
| `npm run android:export-apk`  | Exporta APK a `dist/` con SHA-256                        |
| `npm run android:whatsapp-apk`| Flujo completo: sync + debug + export                    |
| `npm run android:release-check` | sync + debug (verifica que el build no está roto)      |

---

*Última actualización: junio 2026 · MediTime PRO v3.0.0*
