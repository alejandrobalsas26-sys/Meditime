# MediTime PRO — Guía de publicación en Google Play

> Objetivo único de este documento: Android / Google Play.
> No cubre iOS ni App Store.

---

## Tabla de contenidos

1. [Requisitos del entorno](#1-requisitos-del-entorno)
2. [SDK Android requerido](#2-sdk-android-requerido)
3. [Configuración de versión](#3-configuración-de-versión)
4. [Permisos y política](#4-permisos-y-política)
5. [Firma del AAB](#5-firma-del-aab)
6. [Build de release](#6-build-de-release)
7. [Checklist de assets para Play Console](#7-checklist-de-assets-para-play-console)
8. [Metadatos exactos para la ficha](#8-metadatos-exactos-para-la-ficha)
9. [Fiabilidad de alarmas](#9-fiabilidad-de-alarmas)
10. [Pasos manuales en Play Console](#10-pasos-manuales-en-play-console)
11. [Advertencia médica obligatoria](#11-advertencia-médica-obligatoria)

---

## 1. Requisitos del entorno

| Herramienta              | Versión mínima     |
|--------------------------|--------------------|
| Node.js                  | 18 LTS             |
| npm                      | 9+                 |
| Android Studio           | Hedgehog 2023.1.1+ |
| Java JDK                 | 17+ (incluido con Android Studio) |
| Android SDK 35 (API 35)  | Instalado vía SDK Manager |
| Cuenta Google Play Console | Activa (tarifa única USD 25) |

---

## 2. SDK Android requerido

El proyecto usa:

```
compileSdkVersion = 35   (Android 15)
targetSdkVersion  = 35   (requerido por Google Play desde agosto 2024)
minSdkVersion     = 22   (Android 5.1 — cobertura ~99 % de dispositivos activos)
```

### Instalar SDK 35 en Android Studio

1. Abre Android Studio → **SDK Manager** (icono de engranaje en la esquina superior derecha).
2. Pestaña **SDK Platforms** → marca **Android 15 (API 35)**.
3. Pestaña **SDK Tools** → asegúrate de tener **Android SDK Build-Tools 35.x**.
4. Haz clic en **Apply** y espera la descarga.

> Si compilas en terminal y el SDK no está instalado, Gradle falla con:
> `Failed to find target with hash string 'android-35'`
> Instala el SDK en Android Studio y vuelve a ejecutar.

### Android 15 — Edge-to-edge

Apps con targetSdk 35 se fuerzan a modo edge-to-edge en Android 15. Capacitor 6
gestiona esto automáticamente a través del WebView. Si ves barras de sistema
superpuestas al contenido, actualiza `@capacitor/android` a la versión patch más
reciente de la línea 6.x con `npm update @capacitor/android`.

---

## 3. Configuración de versión

Archivo: `android/app/build.gradle`

```
versionCode  30000   (esquema: major × 10 000)
versionName  "3.0.0"
```

Esquema de versionCode para próximas versiones:

| Versión | versionCode |
|---------|-------------|
| 3.0.0   | 30000       |
| 3.1.0   | 31000       |
| 3.1.1   | 31001       |
| 4.0.0   | 40000       |

El versionCode **nunca puede bajar** — Play Console rechaza el AAB si el nuevo
código es ≤ al publicado anteriormente.

---

## 4. Permisos y política

Declarados en `android/app/src/main/AndroidManifest.xml`:

| Permiso                         | Motivo                                                                 |
|---------------------------------|------------------------------------------------------------------------|
| `INTERNET`                      | Capacitor WebView carga los assets de la app. Sin internet, el WebView no arranca. |
| `POST_NOTIFICATIONS`            | Enviar notificaciones de recordatorio (Android 13+, API 33+). El flujo de solicitud de permiso en runtime está implementado en `app.js`. |
| `SCHEDULE_EXACT_ALARM`          | Programar alarmas a la hora exacta del medicamento (Android 12+). El usuario debe concederlo en Ajustes. La app detecta si está denegado y ofrece abrir los ajustes. |
| `ACCESS_COARSE_LOCATION`        | Obtener coordenadas GPS aproximadas durante el flujo SOS de emergencia. Solo se solicita cuando el usuario activa el SOS. |
| `ACCESS_FINE_LOCATION`          | Obtener coordenadas GPS precisas durante el flujo SOS. Solo se solicita cuando el usuario activa el SOS. |

### Formulario Data Safety en Play Console

- **Ubicación:** sí, aproximada y precisa — solo durante SOS, no recopilada ni enviada a servidores.
- **Datos de salud:** no se recopilan ni transmiten — todo permanece en el dispositivo (localStorage).
- **Datos de contacto:** no — los contactos de emergencia se guardan localmente.
- **Sin backend propio:** toda la información está en el dispositivo del usuario.

### Clasificación de contenido

- Categoría: **Salud y bienestar**
- Audiencia: Para todos (no violence, no adult content)
- No requiere inicio de sesión

---

## 5. Firma del AAB

Ver instrucciones completas en `docs/ANDROID_SIGNING.md`.

Resumen rápido:

```bash
# 1. Generar keystore (una vez)
keytool -genkey -v -keystore meditime-release.jks -alias meditime \
  -keyalg RSA -keysize 2048 -validity 10000

# 2. Crear android/signing.properties (plantilla en android/signing.properties.example)
cp android/signing.properties.example android/signing.properties
# Editar signing.properties con la ruta al .jks y las contraseñas

# 3. signing.properties está en .gitignore — nunca se sube
```

---

## 6. Build de release

### Sincronizar web → Android

```bash
npm run android:sync
# o: npx cap sync android
```

### Verificar build (sin firma de release)

```bash
npm run android:release-check
# Equivale a: npm run android:sync && npm run android:debug
# (npx cap sync android + ./gradlew.bat --no-daemon assembleDebug)
```

### Generar APK debug para pruebas locales / WhatsApp

```bash
npm run android:whatsapp-apk
# Flujo completo: sync + assembleDebug + exportar a dist/
# Instrucciones: docs/ANDROID_LOCAL_APK_TESTING.md
```

### Generar AAB firmado

```bash
npm run android:bundle
# Equivale a: cd android && ./gradlew.bat --no-daemon bundleRelease
# Salida: android/app/build/outputs/bundle/release/app-release.aab
```

Si `signing.properties` no existe, bundleRelease falla con error claro.
`assembleDebug` funciona sin credenciales (útil para probar el build).

### Nota en Windows

Los scripts `android:*` usan `./gradlew` (sintaxis Unix). Ejecuta desde
**Git Bash** o el **Terminal integrado de Android Studio**. En PowerShell
sustituye por `.\gradlew.bat`.

---

## 7. Checklist de assets para Play Console

### Icono

- [ ] Ícono de 512×512 px — PNG con fondo sólido (sin transparencia)
- Genera los iconos de lanzador con: `npm run icons`
- El ícono 512×512 para Play Console se sube por separado en Play Console → Ficha de la tienda → Ícono

### Feature Graphic

- [ ] Imagen de 1024×500 px — JPG o PNG
- Se muestra en la ficha de la tienda de Google Play
- Sugerencia: fondo degradado teal con logo MediTime y slogan

### Capturas de pantalla (teléfono)

- [ ] Mínimo 2, máximo 8 capturas
- Tamaño mínimo: 1080×1920 px (portrait) o 1920×1080 px (landscape)
- Sugerencia de pantallas a capturar:
  1. Pantalla principal — lista de medicamentos
  2. Formulario de añadir medicamento
  3. Modal de alarma (recordatorio activo)
  4. Historial de dosis
  5. Función SOS
  6. Ajustes de accesibilidad (modo oscuro / letra grande)

> No incluir coordenadas GPS reales, nombres de pacientes ni datos sensibles.
> Ver `docs/PLAYSTORE_SCREENSHOTS.md` para guía de capturas.

### Capturas de pantalla (tablet) — opcional

- [ ] Tamaño mínimo: 1200×1920 px (tablet 7") o 1920×1200 px (tablet 10")

### Política de privacidad

- [ ] URL pública accesible sin login (por ejemplo GitHub Pages o Notion)
- Debe declarar:
  - La app no recopila, transmite ni vende datos personales
  - Los datos de medicamentos e historial se guardan solo en el dispositivo
  - Los contactos de emergencia se guardan solo en el dispositivo
  - La ubicación solo se usa durante SOS, localmente, sin envío a servidores
  - Ningún servicio de terceros recibe datos del usuario

---

## 8. Metadatos exactos para la ficha

### Título

```
MediTime PRO – Medicamentos
```
(28 caracteres — límite 50)

### Descripción breve

```
Recordatorio de pastillas con SOS, historial y accesibilidad total
```
(67 caracteres — límite 80)

### Descripción completa (≤ 4 000 caracteres)

```
MediTime PRO es el asistente de medicación diseñado especialmente para adultos mayores y sus cuidadores. Nunca más olvides una pastilla.

⚠️ AVISO: MediTime PRO es una herramienta de recordatorio personal. No reemplaza el diagnóstico médico ni la prescripción de un profesional de la salud. Consulta siempre a tu médico antes de modificar tu tratamiento.

CARACTERÍSTICAS PRINCIPALES

• Alarmas inteligentes — configura horarios exactos para cada medicamento con recordatorios sonoros, vibración y notificación en pantalla bloqueada.
• Botón SOS de emergencia — con un toque largo inicia una cuenta regresiva de 10 segundos y llama a tu número de emergencia, mientras muestra tus coordenadas GPS en pantalla.
• Historial completo — consulta los últimos 30 días de medicamentos tomados, omitidos o pospuestos.
• Accesibilidad total — modo oscuro, alto contraste, letra grande y lectura por voz (TTS en español) para personas con baja visión.
• Sin registro ni cuentas — toda la información se guarda en tu dispositivo. Tu privacidad está protegida.
• Funciona sin internet — app 100 % offline una vez instalada.
• Doble toque para confirmar — opción de seguridad para evitar confirmaciones accidentales.
• Contactos de emergencia — guarda los teléfonos de familiares y médico para acceso rápido.

FRECUENCIAS DE TOMA
Diario, días de semana, fines de semana o días alternos.

ALARMAS FIABLES
MediTime usa alarmas exactas de Android para que el recordatorio llegue a la hora precisa, incluso con la pantalla bloqueada o la app en segundo plano. En dispositivos Samsung, Xiaomi o Huawei, configura MediTime como "batería sin restricciones" para máxima fiabilidad.

PARA QUIÉN ES
Diseñada para adultos mayores, personas con enfermedades crónicas, cuidadores y cualquier persona que necesite un recordatorio claro y confiable.

Descarga MediTime PRO y toma el control de tu salud hoy.
```

### Notas de la versión (release notes)

```
Versión 3.0.0

• Alarmas exactas con sonido en pantalla bloqueada (Android 12+)
• Canal de notificación v3 con sonido extendido de 15 s
• Modo senior con selector de hora simplificado
• Diagnóstico de alarmas en Ajustes
• Compatibilidad con Android 5.1 a Android 15
```

### Categoría

- **Salud y bienestar**

### Audiencia objetivo

- Para todos — sin restricción de edad
- No requiere inicio de sesión
- No contiene publicidad
- No hay compras dentro de la app

---

## 9. Fiabilidad de alarmas

El sistema de alarmas está documentado en detalle en `docs/ANDROID_ALARMS.md`.
Puntos clave para la revisión de Play Console:

- Canal de notificación: `meditime_medicine_alarms_v3` — importancia ALTA
- Sonido: `android/app/src/main/res/raw/meditime_alarm_v3.wav` (≈15 s)
- Permiso `SCHEDULE_EXACT_ALARM`: declarado en manifiesto; el usuario lo concede en Ajustes del sistema
- `allowWhileIdle: true` en cada notificación programada
- Botón **"Probar alarma nativa en 3 minutos"** disponible en Ajustes (para validar en dispositivo real)
- Botón **"Revisar alarmas exactas"** abre los ajustes del sistema directamente

---

## 10. Pasos manuales en Play Console

Estos pasos **no pueden automatizarse** y requieren acción humana:

1. **Crear cuenta de Play Console**
   - Ir a [play.google.com/console](https://play.google.com/console)
   - Registrarse como desarrollador individual o empresa
   - Pagar la tarifa única de registro (USD 25)

2. **Crear la app**
   - Crear aplicación → nombre: **MediTime PRO**
   - Idioma predeterminado: Español (Latinoamérica)
   - Tipo: Aplicación
   - Gratuita

3. **Completar la ficha de la tienda**
   - Subir ícono 512×512, feature graphic 1024×500
   - Subir capturas de pantalla (mínimo 2)
   - Completar título, descripción breve, descripción completa
   - Añadir URL de política de privacidad

4. **Subir el AAB a pruebas internas**
   - Pruebas → Pruebas internas → Crear nueva versión
   - Subir `android/app/build/outputs/bundle/release/app-release.aab`
   - Completar notas de la versión

5. **Formulario Data Safety**
   - Declarar que no se recopilan datos del usuario
   - Confirmar que la ubicación se usa solo para SOS (sin envío a servidores)

6. **Clasificación de contenido**
   - Completar el cuestionario (Health → no violencia, no contenido adulto)
   - Resultado esperado: **Para todos**

7. **Acceso a la app**
   - Indicar que no requiere inicio de sesión
   - Añadir instrucciones para el revisor: "Añadir un medicamento con un horario para ver las alarmas. No se requiere cuenta."

8. **Pruebas cerradas (si aplica)**
   - Cuentas personales de Google (gmail.com) pueden requerir 20 probadores opt-in antes de pasar a producción
   - Ejecutar pruebas cerradas al menos 2 semanas si es el caso

9. **Solicitar acceso a producción**
   - Completar la declaración de la política de la app
   - Enviar a revisión

10. **Publicar versión de producción**
    - La revisión de Google tarda entre 1 hora y 3 días hábiles para apps nuevas
    - Monitorear el estado en Play Console → Producción

---

## 11. Advertencia médica obligatoria

MediTime PRO **no es software médico certificado**. La app es un recordatorio
personal de medicamentos. No realiza diagnósticos, no recomienda dosis, no
sustituye la consulta con un profesional de la salud.

El aviso legal visible en la descripción y dentro de la app:

> *"MediTime PRO es una herramienta de recordatorio personal. No reemplaza el
> diagnóstico ni la prescripción médica. Consulta siempre a tu médico antes de
> modificar tu tratamiento."*

Este texto debe aparecer en:
- La descripción completa en Play Console (ya incluido arriba)
- Una sección visible dentro de la app (Ajustes → Acerca de)

---

*Última actualización: junio 2026 · MediTime PRO v3.0.0*
