# Firma de release — MediTime PRO (Android)

Guía para generar el keystore, configurar la firma y producir el AAB firmado
listo para subir a Google Play Console.

---

## 1. Generar el keystore (una sola vez)

Ejecuta en una terminal (Git Bash, PowerShell o cmd):

```bash
keytool -genkey -v \
  -keystore meditime-release.jks \
  -alias meditime \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=MediTime PRO, OU=Mobile, O=TuOrganizacion, L=Ciudad, S=Estado, C=MX"
```

`keytool` pedirá una contraseña de store y una de key. Usa contraseñas distintas
y guárdalas en un gestor de contraseñas (1Password, Bitwarden, etc.).

> **CRÍTICO:** Si pierdes el keystore o las contraseñas, no podrás publicar
> actualizaciones de la app en Play Store. Guarda una copia cifrada fuera del
> equipo (Drive personal, pendrive cifrado, etc.).

---

## 2. Dónde guardar el .jks

**Recomendado:** guarda `meditime-release.jks` **fuera del directorio del
repositorio** (por ejemplo `C:\Users\TuUsuario\keys\meditime-release.jks`).
El `.gitignore` ya excluye `*.jks` y `*.keystore`, pero es más seguro no
tenerlo cerca del código.

Si lo prefieres dentro del proyecto, colócalo en `android/app/` — también
está cubierto por el `.gitignore`.

---

## 3. Crear android/signing.properties

```bash
# Copia la plantilla
cp android/signing.properties.example android/signing.properties
```

Edita `android/signing.properties` con los valores reales:

```properties
# Ruta relativa a android/ (donde está el build.gradle raíz del módulo app)
STORE_FILE=app/meditime-release.jks
# O ruta absoluta (fuera del repo):
# STORE_FILE=C:/Users/TuUsuario/keys/meditime-release.jks

STORE_PASSWORD=tu_contraseña_store
KEY_ALIAS=meditime
KEY_PASSWORD=tu_contraseña_key
```

`signing.properties` está en `.gitignore` → **nunca se incluye en commits**.

---

## 4. Alternativa: variables de entorno (CI/CD)

Si construyes en un servidor de CI (GitHub Actions, Bitrise, etc.), puedes
pasar las credenciales como variables de entorno en lugar de un archivo:

| Variable           | Descripción                          |
|--------------------|--------------------------------------|
| `KEYSTORE_FILE`    | Ruta absoluta al archivo `.jks`      |
| `KEYSTORE_PASSWORD`| Contraseña del store                 |
| `KEY_ALIAS`        | Alias de la clave (`meditime`)       |
| `KEY_PASSWORD`     | Contraseña de la clave               |

El `build.gradle` detecta automáticamente `signing.properties` primero; si no
existe, usa las variables de entorno.

---

## 5. Compilar el AAB firmado

Con `signing.properties` en su lugar:

```bash
npm run android:bundle
# Equivale a: cd android && ./gradlew bundleRelease
# Salida: android/app/build/outputs/bundle/release/app-release.aab
```

Si no hay credenciales, el build falla con:
```
> Keystore file not set for signing config 'release'
```
Eso es el comportamiento esperado — revisa el paso 3.

### Build de depuración (sin firma de release)

```bash
npm run android:debug
# Equivale a: cd android && ./gradlew assembleDebug
# No requiere signing.properties
```

---

## 6. Verificar el AAB antes de subir

```bash
# Listar el contenido del bundle (requiere bundletool de Google)
java -jar bundletool.jar dump manifest --bundle android/app/build/outputs/bundle/release/app-release.aab
```

O simplemente ábrelo en Android Studio: **Build → Analyze APK**.

---

## 7. Esquema de versión

| versionName | versionCode | Criterio                     |
|-------------|-------------|------------------------------|
| 3.0.0       | 30000       | major × 10 000               |
| 3.1.0       | 31000       | incrementar minor             |
| 3.1.1       | 31001       | incrementar patch             |
| 4.0.0       | 40000       | major nuevo                  |

versionCode debe ser **siempre mayor** que el anterior para que Play Console
acepte el AAB. Nunca reutilizar ni bajar un versionCode.

---

*Última actualización: junio 2026 · MediTime PRO v3.0.0*
