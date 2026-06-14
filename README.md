<div align="center">

# 💊 MediTime PRO

**Recordatorio de medicamentos accesible, con SOS de emergencia, pensado para adultos mayores.**

[![Capacitor](https://img.shields.io/badge/Capacitor-6.0-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=white)](https://developer.android.com/)
[![PWA](https://img.shields.io/badge/PWA-instalable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla_JS-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![Versión](https://img.shields.io/badge/versión-3.0.0-0D9488)](#-estado-del-proyecto)

</div>

---

## 📖 ¿Qué es MediTime?

MediTime PRO es una aplicación de **recordatorio de medicamentos** diseñada desde cero para
**adultos mayores y personas con tratamientos crónicos**, y para los familiares y cuidadores
que los acompañan.

Toda la interfaz está pensada para ser usada sin ayuda: botones grandes, lectura por voz,
alto contraste, confirmación por doble toque y un botón **SOS** que obtiene la ubicación GPS
y llama a emergencias. Los datos nunca salen del dispositivo.

## 📱 Capturas de pantalla

| Inicio | Medicinas | SOS | Historial |
|:---:|:---:|:---:|:---:|
| ![Inicio](docs/screenshots/inicio.png) | ![Medicinas](docs/screenshots/medicinas.png) | ![SOS](docs/screenshots/sos.png) | ![Historial](docs/screenshots/historial.png) |

> 📷 Las capturas van en `docs/screenshots/` (`inicio.png`, `medicinas.png`,
> `sos.png`, `historial.png`). Si aún no existen, añádelas en esa carpeta.
>
> ⚠️ **Antes de publicar capturas** lee
> [docs/PLAYSTORE_SCREENSHOTS.md](docs/PLAYSTORE_SCREENSHOTS.md). Las capturas de
> **SOS deben redactar las coordenadas** (difuminadas o `LAT: 0.00000 / LON: 0.00000`)
> y no deben mostrar datos reales de pacientes, médicos ni teléfonos.

## ✨ Características principales

### 💊 Gestión de medicamentos
- Medicamentos con **dosis, notas, color de etiqueta y varios horarios** por día
- Frecuencias: todos los días, Lun–Vie, fines de semana o días alternos
- Prioridad **🚨 Urgente** con sonido de alarma diferenciado

### ⏰ Alarmas que no se escapan
- Alarma en pantalla con opciones **Tomado / Posponer / Omitir**
- Re-aviso cada 5 minutos hasta confirmar (con 2 h de margen)
- **Notificaciones nativas de Android** — suenan aunque la app esté cerrada
- Posponer configurable (5 / 10 / 15 / 30 minutos)

### 🆘 SOS de emergencia
- Activación con **pulsación larga de 2 segundos** (evita llamadas accidentales)
- Obtiene y muestra la **ubicación GPS** en pantalla
- Cuenta atrás de 10 segundos y **llamada automática** al número configurado (911 por defecto)
- Contactos de emergencia y datos del médico en el perfil

### 📋 Historial y adherencia
- Registro de los últimos **30 días**: tomadas, omitidas y pospuestas
- Estadísticas de adherencia de un vistazo

### ♿ Accesibilidad
- **Lectura por voz (TTS)** de cada pantalla y acción
- **Alto contraste**, **letra grande** y **modo oscuro**
- **Doble toque para confirmar** (evita pulsaciones accidentales)
- Navegación completa por teclado y atributos ARIA en toda la app

### 🔒 Privacidad y seguridad
- **100 % offline**: sin servidores, sin cuentas, sin rastreo
- En Android: **bloqueo biométrico** (huella / Face ID) y almacenamiento cifrado (TEE)
- En navegador: datos en `localStorage`, solo en tu dispositivo

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Interfaz | HTML5 + CSS3 + **Vanilla JavaScript** (sin frameworks) |
| App móvil | **Capacitor 6** (WebView nativo) |
| Offline / instalable | **PWA** con Service Worker (cache-first) |
| Notificaciones | `@capacitor/local-notifications` + Web Notifications |
| Seguridad | `capacitor-native-biometric` + `capacitor-secure-storage-plugin` |
| GPS | `@capacitor/geolocation` + API Web Geolocation |
| Voz | Web Speech API (es-ES) |

## 📁 Estructura del proyecto

```
Meditime/
├── MediTime_Web/          # ⭐ App principal (PWA — webDir de Capacitor)
│   ├── index.html
│   ├── app.js             #    Toda la lógica (vanilla JS)
│   ├── styles.css
│   ├── manifest.json      #    PWA + shortcuts
│   ├── service-worker.js  #    Cache offline
│   ├── fonts/             #    DM Sans auto-hospedada (woff2)
│   └── assets/            #    Sonidos de alarma (.wav)
├── android/               # Proyecto nativo Android (generado por Capacitor)
├── MediTime_Mejorado/     # App de escritorio Java/Swing (legado)
├── assets/                # Sonidos compartidos
├── capacitor.config.json
└── GUIA_PUBLICACION.md    # Guía completa para App Store / Play Store
```

## 🚀 Instalación para desarrollo

### Requisitos
- [Node.js](https://nodejs.org) 18 LTS o superior
- [Android Studio](https://developer.android.com/studio) (solo para compilar el APK)

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio> meditime
cd meditime

# 2. Instalar dependencias (Capacitor y plugins)
npm install

# 3. Servir la app web en local
npx serve MediTime_Web
# → abrir http://localhost:3000
```

> 💡 La app funciona abriendo `MediTime_Web/index.html` directamente, pero el
> Service Worker (modo offline) requiere servirla por HTTP — usa `npx serve`.

## 📦 Compilar el APK (Android)

```bash
# 1. Sincronizar la web con el proyecto nativo
npx cap sync

# 2a. Abrir en Android Studio (recomendado)
npx cap open android
#    → Build > Build Bundle(s)/APK(s) > Build APK(s)

# 2b. O compilar por línea de comandos
cd android
./gradlew assembleDebug
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

> 📚 Para firmar el APK y publicarlo en Google Play o App Store, consulta
> [GUIA_PUBLICACION.md](GUIA_PUBLICACION.md).

## 🖥️ App de escritorio (legado)

La carpeta `MediTime_Mejorado/` contiene la versión original de escritorio en
**Java/Swing**. Se conserva como referencia; el desarrollo activo es la app
móvil/PWA. Para ejecutarla: abrir el módulo en IntelliJ IDEA y correr `Main.java`.

## 🔐 Seguridad por diseño

MediTime se construye con la seguridad y la privacidad como principios, no como
añadidos:

- **Offline-first sin backend**: no hay servidor que reciba tus datos.
- **Content-Security-Policy** declarada en `index.html`.
- **Sin `eval`, sin `new Function`, sin `document.write`, sin scripts remotos.**
- **DOM seguro**: la interfaz se construye con `textContent`/`createElement`; no
  se inyecta HTML controlado por el usuario.
- **Validación y saneamiento** de toda entrada antes de guardarla.
- **Android**: almacenamiento seguro, `allowBackup=false` y bloqueo biométrico
  cuando está disponible.

Más detalle en [SECURITY.md](SECURITY.md) y [PRIVACY.md](PRIVACY.md).

## ✅ Pruebas y Quality Gates

El proyecto incluye comprobaciones automáticas que también corren en CI:

```bash
npm run check          # Todo: seguridad + PWA + tests + build
npm run security:check # Análisis estático (CSP, sin eval/Function/document.write)
npm run validate:pwa   # Manifest e iconos + precache del service worker
npm test               # Tests de validadores (node --test)
```

> `npm run check` es la puerta de calidad: encadena `security:check`,
> `validate:pwa`, `test` y `build`.

## 📋 Checklist de Release Readiness

- [ ] `npm run check` pasa sin errores.
- [ ] Iconos generados (`npm run icons`) y presentes en `MediTime_Web/icons/`.
- [ ] Capturas de pantalla añadidas en `docs/screenshots/`.
- [ ] `npx cap sync android` ejecutado tras cambios en la web.
- [ ] APK firmado para publicación (ver [GUIA_PUBLICACION.md](GUIA_PUBLICACION.md)).
- [ ] Revisado [PRIVACY.md](PRIVACY.md) y [SECURITY.md](SECURITY.md).
- [ ] Datos de contacto de privacidad/seguridad completados.

> Lista detallada de pruebas y pasos en
> [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).

La app está **lista para pruebas internas**, pero un **lanzamiento a producción
todavía requiere**:

- AAB de release **firmado**.
- Ficha en **Play Console**.
- **URL pública** de la política de privacidad.
- Formulario de **Seguridad de los datos** (Data Safety).
- **Pruebas de alarmas en dispositivo real**.
- Capturas con **datos demo / coordenadas redactadas**
  (ver [docs/PLAYSTORE_SCREENSHOTS.md](docs/PLAYSTORE_SCREENSHOTS.md)).

> MediTime **no es un dispositivo médico certificado**.

## 📊 Estado del proyecto

**Versión 3.0.0 — en desarrollo activo** 🚧

- [x] App web PWA completa y funcional
- [x] Proyecto Android con Capacitor 6
- [x] Alarmas nativas, biometría y almacenamiento seguro
- [x] SOS con GPS y llamada de emergencia
- [x] Accesibilidad: TTS, alto contraste, letra grande, doble toque
- [ ] Iconos de la app (`MediTime_Web/icons/`) — en diseño
- [ ] Capturas de pantalla para las tiendas
- [ ] Publicación en Google Play

## 📄 Licencia

Proyecto privado — todos los derechos reservados.

---

<div align="center">
Hecho con ❤️ para que ninguna dosis se olvide
</div>
