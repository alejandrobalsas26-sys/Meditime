# Guía de Publicación — MediTime PRO

> **Objetivo de release activo: Android / Google Play.**
> La sección iOS se conserva como referencia pero **no es el target actual**.
> Para el flujo completo de Android consulta primero `docs/ANDROID_PLAYSTORE_RELEASE.md`.

Versión 3.0.0 · Target principal: Android (Google Play) · iOS: referencia futura

---

## Tabla de contenidos

1. [Requisitos previos](#1-requisitos-previos)
2. [Instalación y preparación del proyecto](#2-instalación-y-preparación-del-proyecto)
3. [Publicación en iOS (App Store)](#3-publicación-en-ios-app-store)
4. [Publicación en Android (Google Play)](#4-publicación-en-android-google-play)
5. [Assets requeridos](#5-assets-requeridos)
6. [Metadatos de las tiendas](#6-metadatos-de-las-tiendas)
7. [Consejos críticos para la revisión de Apple (apps de salud)](#7-consejos-críticos-para-la-revisión-de-apple-apps-de-salud)

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Instalación |
|---|---|---|
| Node.js | 18 LTS | https://nodejs.org |
| npm | 9+ | incluido con Node |
| Xcode | 15+ | Mac App Store |
| Android Studio | Hedgehog (2023.1.1)+ | https://developer.android.com/studio |
| Java JDK | 17+ | incluido con Android Studio |
| Cuenta Apple Developer | activa | https://developer.apple.com |
| Cuenta Google Play Console | activa | https://play.google.com/console |

> **Nota:** Xcode solo está disponible en macOS. Para compilar la versión iOS es obligatorio usar un Mac.

---

## 2. Instalación y preparación del proyecto

### 2.1 Clonar e instalar dependencias

```bash
# Clonar el repositorio (o descomprimir el ZIP del proyecto)
git clone <url-del-repositorio> meditime-pro
cd meditime-pro

# Instalar todas las dependencias de Capacitor
npm install
```

### 2.2 Inicializar Capacitor (solo la primera vez)

```bash
npx cap init "MediTime PRO" com.meditime.pro --web-dir MediTime_Web
```

Esto genera o actualiza `capacitor.config.json` con el `appId` y el `webDir` correctos.

### 2.3 Agregar plataformas nativas

```bash
# iOS
npx cap add ios

# Android
npx cap add android
```

Cada comando crea una carpeta nativa (`ios/` y `android/`) con el proyecto Xcode/Android Studio.

### 2.4 Sincronizar la web con las plataformas nativas

Ejecutar **siempre** que se modifique código web o el archivo `capacitor.config.json`:

```bash
npx cap sync
```

`cap sync` equivale a `cap copy` + `cap update`: copia los archivos web al proyecto nativo y actualiza los plugins de Capacitor.

---

## 3. Publicación en iOS (App Store)

### 3.1 Abrir el proyecto en Xcode

```bash
npx cap open ios
```

Se abrirá automáticamente Xcode con el workspace `App.xcworkspace`.

### 3.2 Configurar la firma de código (Code Signing)

1. En Xcode selecciona el proyecto `App` en el panel izquierdo.
2. Ve a la pestaña **Signing & Capabilities**.
3. Marca **Automatically manage signing**.
4. En **Team** elige tu cuenta de Apple Developer (debe tener el rol de Admin o Agent).
5. Verifica que el **Bundle Identifier** sea exactamente `com.meditime.pro`.
6. Xcode descargará automáticamente el provisioning profile. Si aparece un error de certificado, abre **Xcode → Settings → Accounts → Manage Certificates** y genera un nuevo certificado de distribución.

### 3.3 Ajustes de versión y build

En `App/App/Info.plist` (o desde la pestaña **General** de Xcode):

| Campo | Valor |
|---|---|
| Bundle Identifier | `com.meditime.pro` |
| Bundle Display Name | MediTime PRO |
| Bundle Version (Build) | Incrementar en cada envío a TestFlight (ej. 1, 2, 3…) |
| Bundle Short Version (Versión) | 3.0.0 |

### 3.4 Permisos en Info.plist

Agregar las siguientes claves si no están presentes (Capacitor las añade automáticamente al hacer `sync`, pero verifica):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>MediTime usa tu ubicación únicamente durante una emergencia SOS para mostrártela en pantalla.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>MediTime usa tu ubicación únicamente durante una emergencia SOS.</string>

<key>UNUserNotificationCenter</key>
<!-- gestionado por Capacitor LocalNotifications -->
```

### 3.5 Compilar para distribución (Archive)

1. En Xcode, en el menú superior selecciona el dispositivo **Any iOS Device (arm64)**.
2. Menú **Product → Archive**.
3. Cuando termine, se abre el **Organizer**. Haz clic en **Distribute App**.
4. Selecciona **App Store Connect** → **Upload**.
5. Activa **Strip Swift symbols** y **Upload your app's symbols**.
6. Haz clic en **Upload**. El proceso tarda entre 2 y 10 minutos.

### 3.6 TestFlight (pruebas antes de publicar)

1. Entra a [appstoreconnect.apple.com](https://appstoreconnect.apple.com).
2. Selecciona tu app → **TestFlight**.
3. Espera a que el build supere el procesamiento automático de Apple (puede tardar hasta 30 minutos).
4. En **Internal Testing** agrega probadores con su Apple ID.
5. Para pruebas externas (hasta 10,000 testers) crea un **Grupo externo** y envía la build a revisión beta de Apple (normalmente aprobada en 24–48 h).

### 3.7 Checklist App Store Connect antes de enviar a revisión

- [ ] Capturas de pantalla subidas para iPhone 6.5" y iPhone 5.5" (obligatorias).
- [ ] Capturas para iPad 12.9" si la app soporta iPad.
- [ ] Ícono de 1024×1024 px PNG sin transparencia, sin bordes redondeados (Apple los aplica).
- [ ] Descripción, palabras clave y subtítulo completos en español.
- [ ] URL de política de privacidad válida y accesible (obligatoria).
- [ ] Categoría primaria: **Salud y forma física** o **Medicina**.
- [ ] Clasificación de edad configurada (la encuesta de contenido completada).
- [ ] Campo "Notas para el revisor" con instrucciones claras de uso y credenciales de demo si aplica.
- [ ] Si la app no usa un servidor propio, marcar "No requiere inicio de sesión" en el campo de demo account.
- [ ] Export Compliance: seleccionar "No" en cifrado si usas HTTPS estándar del sistema.

---

## 4. Publicación en Android (Google Play)

### 4.1 Abrir el proyecto en Android Studio

```bash
npx cap open android
```

### 4.2 Generar el keystore de firma (una sola vez)

Guarda el archivo `.jks` y la contraseña en un lugar seguro. **Si lo pierdes, no podrás actualizar la app en Play Store.**

```bash
keytool -genkey -v \
  -keystore meditime-release.jks \
  -alias meditime \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass TU_CONTRASEÑA_STORE \
  -keypass TU_CONTRASEÑA_KEY \
  -dname "CN=MediTime PRO, OU=Mobile, O=TuEmpresa, L=Ciudad, S=Estado, C=MX"
```

Mueve el archivo `meditime-release.jks` a la raíz del módulo `android/app/`.

### 4.3 Configurar la firma en Gradle

Edita `android/app/build.gradle` y agrega dentro de `android { ... }`:

```groovy
signingConfigs {
    release {
        storeFile file("meditime-release.jks")
        storePassword "TU_CONTRASEÑA_STORE"
        keyAlias "meditime"
        keyPassword "TU_CONTRASEÑA_KEY"
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

> **Seguridad:** No incluyas contraseñas en texto plano en el repositorio. Usa variables de entorno o el archivo `local.properties` (que está en `.gitignore`).

### 4.4 Compilar el AAB firmado

En Android Studio:

1. Menú **Build → Generate Signed Bundle / APK**.
2. Selecciona **Android App Bundle (.aab)**.
3. Apunta al keystore `meditime-release.jks` e ingresa las contraseñas.
4. Selecciona `release` como variante de compilación.
5. El AAB se generará en `android/app/release/app-release.aab`.

Alternativamente desde la terminal:

```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 4.5 Subir a Google Play Console

1. Entra a [play.google.com/console](https://play.google.com/console).
2. Crea una nueva app → **Crear aplicación**.
3. Idioma predeterminado: **Español (España)** o **Español (Latinoamérica)**.
4. Completa la **ficha de la tienda** (descripción breve, completa, capturas, ícono).
5. Ve a **Producción → Crear nueva versión** (o usa primero **Pruebas internas**).
6. En **App bundles**, sube el archivo `app-release.aab`.
7. Completa las **notas de la versión** en español.
8. Responde el **cuestionario de clasificación de contenido** (Health → no violence, no adult content).
9. En **Acceso a la app**: indica si requiere inicio de sesión (MediTime no requiere cuenta).
10. Haz clic en **Guardar** → **Revisar versión** → **Publicar en producción**.

La revisión de Google tarda normalmente entre 1 hora y 3 días hábiles para apps nuevas.

---

## 5. Assets requeridos

### Íconos de app

| Plataforma | Tamaño | Formato | Notas |
|---|---|---|---|
| Android launcher | 48×48 px | PNG | mdpi |
| Android launcher | 72×72 px | PNG | hdpi |
| Android launcher | 96×96 px | PNG | xhdpi |
| Android launcher | 144×144 px | PNG | xxhdpi |
| Android launcher | 192×192 px | PNG | xxxhdpi |
| Android Play Store | 512×512 px | PNG | fondo sólido |
| iOS app icon | 1024×1024 px | PNG | sin transparencia, sin esquinas redondeadas |
| PWA manifest | 192×192 px | PNG | maskable recomendado |
| PWA manifest | 512×512 px | PNG | maskable recomendado |

### Gráfico de características (Feature Graphic)

| Plataforma | Tamaño | Formato | Notas |
|---|---|---|---|
| Google Play | 1024×500 px | JPG o PNG | se muestra en la ficha de la tienda |

### Capturas de pantalla

| Plataforma | Tamaño | Cantidad |
|---|---|---|
| iPhone 6.5" (14 Pro Max) | 1290×2796 px | mínimo 3, máximo 10 |
| iPhone 5.5" (8 Plus) | 1242×2208 px | mínimo 3, máximo 10 |
| iPad Pro 12.9" (6th gen) | 2048×2732 px | mínimo 3 (si soportas iPad) |
| Google Play (teléfono) | 1080×1920 px (mín.) | mínimo 2, máximo 8 |
| Google Play (tablet 7") | 1200×1920 px | recomendado |
| Google Play (tablet 10") | 1920×1200 px | recomendado |

---

## 6. Metadatos de las tiendas

### App Store (iOS)

| Campo | Límite | Valor sugerido |
|---|---|---|
| Nombre de la app | 30 caracteres | MediTime PRO |
| Subtítulo | 30 caracteres | Recordatorio de medicamentos |
| Palabras clave | 100 caracteres | medicamentos,pastillas,recordatorio,salud,mayores,dosis,alarma,medicina,SOS,paciente |
| Descripción | 4.000 caracteres | ver texto completo abajo |
| Categoría primaria | — | Medicina |
| Categoría secundaria | — | Salud y forma física |
| Clasificación de edad | — | 4+ |

**Descripción sugerida para App Store (≤ 4.000 caracteres):**

```
MediTime PRO es el asistente de medicación diseñado especialmente para adultos mayores y sus cuidadores. Nunca más olvides una pastilla.

CARACTERÍSTICAS PRINCIPALES

• Alarmas inteligentes — configura horarios exactos para cada medicamento con recordatorios sonoros, vibración y notificaciones en pantalla.
• Botón SOS de emergencia — con un solo toque inicia una cuenta regresiva de 10 segundos y llama automáticamente a tu número de emergencia, mientras comparte tus coordenadas GPS.
• Historial completo — consulta los últimos 30 días de medicamentos tomados, omitidos o pospuestos.
• Accesibilidad total — modo oscuro, alto contraste, letra grande y lectura por voz (TTS en español) para personas con baja visión.
• Sin registro ni cuentas — toda la información se guarda en tu dispositivo. Tu privacidad está protegida.
• Funciona sin internet — app 100 % offline una vez instalada.
• Doble toque para confirmar — opción de seguridad para evitar confirmaciones accidentales.
• Contactos de emergencia — guarda los teléfonos de familiares y médico para acceso rápido.

FRECUENCIAS DE TOMA
Diario, días de semana, fines de semana o días alternos.

PARA QUIÉN ES
Diseñada para adultos mayores, personas con enfermedades crónicas, cuidadores y cualquier persona que necesite un recordatorio claro y confiable.

Descarga MediTime PRO y toma el control de tu salud hoy.
```

### Google Play (Android)

| Campo | Límite | Valor sugerido |
|---|---|---|
| Título | 50 caracteres | MediTime PRO – Medicamentos |
| Descripción breve | 80 caracteres | Recordatorio de pastillas con SOS, historial y accesibilidad total |
| Descripción completa | 4.000 caracteres | misma descripción que App Store (adaptada) |
| Categoría | — | Salud y bienestar |
| Clasificación de contenido | — | Para todos |
| Política de privacidad | URL obligatoria | — |

---

## 7. Consejos críticos para la revisión de Apple (apps de salud)

Apple aplica criterios muy estrictos a las apps de la categoría **Medicina** y **Salud y forma física**. Estos son los cinco puntos más importantes para evitar un rechazo:

### Consejo 1 — Incluye un aviso legal médico claro y visible

Apple rechaza apps que puedan interpretarse como sustitutos de consejo médico profesional. Añade una pantalla de bienvenida o una sección de ajustes con un texto similar a:

> *"MediTime PRO es una herramienta de recordatorio personal. No reemplaza el diagnóstico ni la prescripción médica. Consulta siempre a tu médico antes de modificar tu tratamiento."*

Este aviso debe estar disponible desde la ficha de la tienda (en la descripción) **y** dentro de la app. El revisor lo buscará activamente.

### Consejo 2 — Justifica cada permiso con un texto de propósito claro

Apple revisa que cada `NSUsageDescription` en `Info.plist` sea descriptivo y específico. Una descripción genérica como "necesita tu ubicación" puede causar rechazo. Usa siempre frases que expliquen **cuándo y por qué** se usa el permiso, como se muestra en la sección 3.4 de esta guía. Si la app solicita un permiso que el revisor no puede activar durante la prueba, explícalo en el campo "Notas para el revisor".

### Consejo 3 — Completa exhaustivamente el campo "Notas para el revisor"

El revisor de Apple tiene entre 5 y 15 minutos para evaluar tu app. Si hay flujos que requieren configuración previa (como configurar un número SOS o agregar medicamentos para ver las alarmas), descríbelos paso a paso. Incluye:

- Cómo navegar a cada función principal.
- Qué datos de demo cargar para ver las alarmas en acción.
- Por qué la app NO requiere inicio de sesión ni recopila datos del usuario.
- Confirmación de que los datos se almacenan únicamente en el dispositivo (`localStorage` / `UserDefaults`).

### Consejo 4 — Política de privacidad sólida y en el idioma correcto

Una URL de política de privacidad es obligatoria para toda app que maneje datos de salud. La política debe:

- Estar en línea y accesible sin inicio de sesión.
- Declarar explícitamente que la app **no recopila, transmite ni vende** datos personales.
- Mencionar que toda la información (medicamentos, historial, contactos) se guarda exclusivamente en el dispositivo del usuario.
- Indicar si la app usa servicios de terceros (en este caso: fuentes de Google Fonts vía CDN — considera hospedarlas localmente para cumplir con la CSP y simplificar la declaración de privacidad).

Apple también muestra el resumen de privacidad ("nutrition labels") en la ficha de la tienda. En App Store Connect, selecciona **"Los datos no se recopilan"** para todas las categorías, dado que MediTime PRO no tiene backend.

### Consejo 5 — Evita el uso de emojis como único indicador de estado crítico

El revisor de Apple verifica la accesibilidad con VoiceOver activo. Botones o etiquetas que usen únicamente un emoji (🆘, ✅, 💊) como contenido deben tener un atributo `aria-label` descriptivo en el HTML, que Capacitor traduce a `accessibilityLabel` en UIKit. Revisa que todos los controles interactivos tengan etiquetas de texto alternativo. El incumplimiento de las guías de accesibilidad es motivo frecuente de rechazo bajo la directriz **5.1.1** de las App Store Review Guidelines.

---

*Última actualización: mayo 2026 · MediTime PRO v3.0.0*
